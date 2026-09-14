import { Express, Request, Response } from 'express';
import { orgStore } from '../org/store.js';
import { orgService } from '../org/services.js';
import { normalizeEvent } from '../evidence/normalizers.js';
import { normalizeLabRecord } from '../evidence/labNormalizer.js';
import { CanonicalEvidence } from '../evidence/contract.js';
import { deriveLearnerState } from '../evidence/learnerState.js';
import { scenarios } from '../org/scenarios.js';
import { generatePrefeedRecords } from '../org/prefeedGenerator.js';
import { evaluationRunner } from '../eval/runner.js';
import { broadcastAllEvidenceToCloud, broadcastShiftToCloud } from '../lib/firestoreSync.js';

export function getAllCanonicalEvidence(): CanonicalEvidence[] {
  const events = orgStore.getEventsSince(undefined, undefined);
  let evidence: CanonicalEvidence[] = [];
  
  for (const evt of events) {
    evidence.push(...normalizeEvent(evt));
  }

  for (const record of orgStore.labRecords) {
    evidence.push(...normalizeLabRecord(record));
  }

  return evidence.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function syncAllEvidenceToFirestore(): Promise<void> {
  const allEvidence = getAllCanonicalEvidence();
  if (allEvidence.length > 0) {
    await broadcastAllEvidenceToCloud(allEvidence);
  }
}

export async function ensureInitialData() {
  if (!orgStore.hasInitialized) {
    if (orgStore.rawEvents.length === 0 && orgStore.labRecords.length === 0) {
      const defaultEmployees = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004'];
      for (const empId of defaultEmployees) {
        const records = generatePrefeedRecords(empId, 5, 'Medium');
        for (const record of records) {
          orgStore.upsertLabRecord(record);
        }
      }
    }
    orgStore.hasInitialized = true;
    await orgStore.save();
    // Continuously seed cloud simulator_evidence collection
    syncAllEvidenceToFirestore().catch(e => console.warn('Initial firestore broadcast warning:', e));
  }
}

export async function getEvidenceHandler(req: Request, res: Response) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    await orgStore.load();
    const sinceTimestamp = req.query.since_timestamp as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const employeeId = req.query.employeeId as string | undefined;
    const journeyDay = req.query.journeyDay as string | undefined;

    // Ensure initial historical evidence exists if store is empty on serverless invocation
    await ensureInitialData();

    const events = orgStore.getEventsSince(sinceTimestamp, undefined); // fetch all, filter later
    let evidence: CanonicalEvidence[] = [];
    
    for (const evt of events) {
      evidence.push(...normalizeEvent(evt));
    }

    // Merge lab records
    let filteredLabRecords = orgStore.labRecords;
    if (sinceTimestamp) {
      filteredLabRecords = filteredLabRecords.filter(r => r.updatedAt >= sinceTimestamp);
    }
    for (const record of filteredLabRecords) {
      evidence.push(...normalizeLabRecord(record));
    }

    // Sort globally by timestamp
    evidence = evidence.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Apply employeeId and journeyDay filters
    if (employeeId) {
      evidence = evidence.filter(e => e.subject_id === employeeId);
    }
    if (journeyDay !== undefined) {
      evidence = evidence.filter(e => e.context?.journey_day === parseInt(journeyDay, 10));
    }

    if (limit && limit > 0) {
      evidence = evidence.slice(0, limit);
    }

    res.json({
      data: evidence,
      count: evidence.length,
      meta: {
        since_timestamp: sinceTimestamp || null,
        limit: limit || null,
        employee_id: employeeId || null,
        journey_day: journeyDay || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export function setupRoutes(app: Express) {
  
  app.use(async (req: Request, res: Response, next) => {
    try {
      await orgStore.load();
      await ensureInitialData();
      next();
    } catch (err) {
      next(err);
    }
  });

  // --- INTERNAL ORG ROUTES (FOR SIMULATOR UI) ---
  
  app.get('/api/internal/lab/employees', (req: Request, res: Response) => {
    // Return employees with their lab progress
    const enriched = orgStore.employees.map(emp => {
      const empRecords = orgStore.labRecords.filter(r => r.employeeId === emp.id);
      const populatedDays = empRecords.length;
      const latestDay = empRecords.reduce((max, r) => Math.max(max, r.journeyDay), -1);
      return {
        ...emp,
        populatedDays,
        latestDay: latestDay >= 0 ? latestDay : null,
        records: empRecords.sort((a, b) => a.journeyDay - b.journeyDay)
      };
    });
    res.json(enriched);
  });

  app.get('/api/internal/lab/records/:employeeId', (req: Request, res: Response) => {
    const records = orgStore.labRecords.filter(r => r.employeeId === req.params.employeeId);
    res.json(records);
  });

  app.post('/api/internal/lab/record', async (req: Request, res: Response) => {
    try {
      const record = req.body;
      record.updatedAt = new Date().toISOString();
      orgStore.upsertLabRecord(record);
      await orgStore.save();
      // Real-time Firestore continuous push
      const normalized = normalizeLabRecord(record);
      for (const item of normalized) {
        broadcastShiftToCloud(item).catch(e => console.warn('Broadcast item failed:', e));
      }
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/internal/lab/prefeed', async (req: Request, res: Response) => {
    try {
      const { employeeId, days, complexity } = req.body;
      if (!employeeId || typeof days !== 'number' || !complexity) {
        throw new Error('Missing required fields: employeeId, days, complexity');
      }
      if (days < 1 || days > 10) {
        throw new Error('Days must be between 1 and 10');
      }
      
      const records = generatePrefeedRecords(employeeId, days, complexity);
      for (const record of records) {
        orgStore.upsertLabRecord(record);
      }
      await orgStore.save();
      // Continuous bulk broadcast to Firestore
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast all evidence failed:', e));
      
      res.json({ success: true, records });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/internal/lab/record/:employeeId/:journeyDay', async (req: Request, res: Response) => {
    try {
      orgStore.clearLabRecord(req.params.employeeId, parseInt(req.params.journeyDay, 10));
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/internal/lab/journey/:employeeId', async (req: Request, res: Response) => {
    try {
      orgStore.clearLabJourney(req.params.employeeId);
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/internal/scenario/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { employeeId } = req.body;
      const supervisorId = orgStore.employees.find(e => e.role === 'Supervisor')?.id || 'EMP-999';
      
      switch(id) {
        case 'A': scenarios.runScenarioA(employeeId, supervisorId); break;
        case 'B': scenarios.runScenarioB(employeeId); break;
        case 'C': scenarios.runScenarioC(employeeId); break;
        case 'D': scenarios.runScenarioD(employeeId); break;
        case 'E': scenarios.runScenarioE(employeeId); break;
        default: return res.status(400).json({ error: 'Unknown scenario' });
      }
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json({ success: true, scenario: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get('/api/internal/employees', (req: Request, res: Response) => {
    res.json(orgStore.employees);
  });

  app.get('/api/internal/shifts', (req: Request, res: Response) => {
    res.json(orgStore.shifts);
  });

  app.post('/api/internal/shift/start', async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.body;
      const shift = orgService.startShift(employeeId);
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/internal/shift/complete', async (req: Request, res: Response) => {
    try {
      const { shiftId } = req.body;
      const shift = orgService.completeShift(shiftId);
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/internal/task/pick', async (req: Request, res: Response) => {
    try {
      const { shiftId, unitsProcessed, durationSeconds, errorCount } = req.body;
      const task = orgService.logPickBatch(shiftId, unitsProcessed, durationSeconds, errorCount);
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/internal/observation', async (req: Request, res: Response) => {
    try {
      const { supervisorId, employeeId, noteType } = req.body;
      const obs = orgService.addObservation(supervisorId, employeeId, noteType);
      await orgStore.save();
      syncAllEvidenceToFirestore().catch(e => console.warn('Broadcast sync failed:', e));
      res.json(obs);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
  
  app.post('/api/internal/clear', async (req: Request, res: Response) => {
    orgStore.clearData();
    await orgStore.save();
    res.json({ success: true });
  });

  app.get('/api/internal/lab/learner-state/:employeeId/:journeyDay', (req: Request, res: Response) => {
    try {
      const employeeId = req.params.employeeId;
      const journeyDay = parseInt(req.params.journeyDay, 10);

      // We need to build up canonical evidence for this employee
      const employeeRecords = orgStore.labRecords.filter(r => r.employeeId === employeeId);
      const allEvidence: CanonicalEvidence[] = [];
      for (const record of employeeRecords) {
        allEvidence.push(...normalizeLabRecord(record));
      }

      // Then derive Learner State
      const state = deriveLearnerState(employeeId, journeyDay, allEvidence);

      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- EXTERNAL INTEGRATION BOUNDARY ---

  app.get('/api/v1/evidence', getEvidenceHandler);

  // --- AI-7 DEAN EVALUATION LABORATORY ROUTES ---

  app.get('/api/internal/eval/scenarios', (req: Request, res: Response) => {
    try {
      const scenariosList = evaluationRunner.getScenarios().map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        employeeId: s.employeeId,
        journeyDay: s.journeyDay,
        expected: s.expected
      }));
      res.json(scenariosList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/internal/eval/run', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.body || {};
      if (scenarioId) {
        const result = await evaluationRunner.runScenario(scenarioId);
        res.json({ success: true, result });
      } else {
        const report = await evaluationRunner.runAll();
        res.json({ success: true, report });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/internal/eval/report', (req: Request, res: Response) => {
    try {
      const report = evaluationRunner.getLastReport();
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
