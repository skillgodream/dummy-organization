import { describe, it } from 'node:test';
import assert from 'node:assert';
import { orgService } from '../org/services.js';
import { orgStore } from '../org/store.js';
import { normalizeEvent } from '../evidence/normalizers.js';
import { normalizeLabRecord } from '../evidence/labNormalizer.js';
import { scenarios } from '../org/scenarios.js';

describe('Evidence Normalization Boundary', () => {
  it('should isolate internal organization structure from canonical evidence', () => {
    orgStore.clearData();
    
    // 1. Organization Action
    const shift = orgService.startShift('EMP-001');
    const task = orgService.logPickBatch(shift.id, 100, 3600, 2);
    
    // 2. Raw Events exist internally
    const events = orgStore.getEventsSince();
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].eventType, 'shift_started');
    assert.strictEqual(events[1].eventType, 'pick_batch_completed');
    
    // Internal fields exist
    assert.ok(events[1].payload.taskLog.shiftId);
    
    // 3. Normalization logic produces canonical evidence
    const startEvidence = normalizeEvent(events[0]);
    assert.strictEqual(startEvidence.length, 1);
    assert.strictEqual(startEvidence[0].category, 'attendance');
    assert.strictEqual(startEvidence[0].evidence_kind, 'observed');
    
    const pickEvidence = normalizeEvent(events[1]);
    assert.strictEqual(pickEvidence.length, 3); // volume, error, velocity
    
    const velocityEv = pickEvidence.find(e => e.type === 'pick_velocity');
    assert.ok(velocityEv);
    assert.strictEqual(velocityEv.evidence_kind, 'derived');
    assert.strictEqual(velocityEv.value, 100); // (100 / 3600) * 3600
    
    // Proof of Isolation: No internal 'shiftId' on the top level, strict subject mapping
    assert.strictEqual(velocityEv.subject_type, 'employee');
    assert.strictEqual(velocityEv.subject_id, 'EMP-001');
    assert.strictEqual(velocityEv.context?.shift_id, shift.id);
    assert.strictEqual(velocityEv.context?.task_id, task.id);
    assert.ok(velocityEv.derivation_metadata?.source_events.includes(events[1].eventId));
  });

  it('API respects since_timestamp and limit params', async () => {
    orgStore.clearData();
    
    orgService.startShift('EMP-001');
    await new Promise(resolve => setTimeout(resolve, 10)); // ensure timestamp increments
    const midTime = new Date().toISOString();
    await new Promise(resolve => setTimeout(resolve, 10)); // ensure timestamp increments
    orgService.startShift('EMP-002');
    
    const all = orgStore.getEventsSince();
    assert.strictEqual(all.length, 2);
    
    const since = orgStore.getEventsSince(midTime);
    assert.strictEqual(since.length, 1);
    
    const limited = orgStore.getEventsSince(undefined, 1);
    assert.strictEqual(limited.length, 1);
  });

  it('distinguishes causal scenarios for similar productivity outcomes', () => {
    // Scenario A: Productivity drop due to Skill Problem
    orgStore.clearData();
    scenarios.runScenarioA('EMP-001', 'EMP-999');
    
    const evA = orgStore.getEventsSince().flatMap(normalizeEvent);
    const hasSkillIssue = evA.some(e => e.type === 'supervisor_note' && e.value === 'SkillIssue');
    const hasSkillFail = evA.some(e => e.type === 'skill_assessment_failed');
    
    // Verify velocity actually dropped in the scenario
    const velocitiesA = evA.filter(e => e.type === 'pick_velocity').map(e => e.value);
    assert.ok(velocitiesA[1] < velocitiesA[0]);
    assert.ok(hasSkillIssue, 'Scenario A should have a skill issue reported');
    assert.ok(hasSkillFail, 'Scenario A should have a skill assessment fail');
    
    // Scenario B: Productivity drop due to Tool Problem
    orgStore.clearData();
    scenarios.runScenarioB('EMP-001');
    
    const evB = orgStore.getEventsSince().flatMap(normalizeEvent);
    const hasToolProblem = evB.some(e => e.type === 'tool_problem');
    const hasSkillIssueB = evB.some(e => e.type === 'supervisor_note' && e.value === 'SkillIssue');
    
    const velocitiesB = evB.filter(e => e.type === 'pick_velocity').map(e => e.value);
    assert.ok(velocitiesB[1] < velocitiesB[0]);
    assert.ok(hasToolProblem, 'Scenario B should have a tool problem reported');
    assert.strictEqual(hasSkillIssueB, false, 'Scenario B should NOT have a skill issue');
  });

  it('Lab normalizer generates evidence from manual records and injects targets', () => {
    const record = {
      employeeId: 'EMP-001',
      journeyDay: 3,
      updatedAt: new Date().toISOString(),
      actualUnits: 58,
      timeTakenMinutes: 60,
      toolIssue: 'Scanner broken',
      shiftStatus: 'Present',
      trainingStatus: 'Not Available'
    };
    
    const evidence = normalizeLabRecord(record);
    
    // We expect volume, time_taken, velocity, tool_problem, shift_status
    // Note: trainingStatus = 'Not Available' should NOT produce an event.
    assert.strictEqual(evidence.find(e => e.type === 'training_status'), undefined, 'Not Available should be ignored');
    
    const volume = evidence.find(e => e.type === 'pick_volume');
    assert.strictEqual(volume?.value, 58);
    assert.strictEqual(volume?.context?.journey_day, 3);
    assert.strictEqual(volume?.context?.target, 60);
    assert.strictEqual(volume?.context?.target_operator, '>=');
    assert.strictEqual(volume?.unit, 'items/hour');
    
    const tool = evidence.find(e => e.type === 'tool_problem');
    assert.strictEqual(tool?.value, 'Scanner broken');
  });

  it('Lab records can be upserted and cleared without deleting other days', () => {
    orgStore.clearData();
    
    orgStore.upsertLabRecord({ employeeId: 'EMP-001', journeyDay: 1, updatedAt: 'a', actualUnits: 50 });
    orgStore.upsertLabRecord({ employeeId: 'EMP-001', journeyDay: 2, updatedAt: 'b', actualUnits: 60 });
    
    assert.strictEqual(orgStore.labRecords.length, 2);
    
    // Updating existing
    orgStore.upsertLabRecord({ employeeId: 'EMP-001', journeyDay: 1, updatedAt: 'c', actualUnits: 55 });
    assert.strictEqual(orgStore.labRecords.length, 2);
    assert.strictEqual(orgStore.labRecords.find(r => r.journeyDay === 1)?.actualUnits, 55);
    
    // Clear one day
    orgStore.clearLabRecord('EMP-001', 1);
    assert.strictEqual(orgStore.labRecords.length, 1);
    assert.strictEqual(orgStore.labRecords[0].journeyDay, 2);
    
    // Restart journey
    orgStore.clearLabJourney('EMP-001');
    assert.strictEqual(orgStore.labRecords.length, 0);
  });
});

import { generatePrefeedRecords } from '../org/prefeedGenerator.js';
import { deriveLearnerState } from '../evidence/learnerState.js';

describe('Pre-Feed History Generator', () => {
  it('Selecting 1 day creates one historical journey record', () => {
    const records = generatePrefeedRecords('EMP-001', 1, 'Low');
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].journeyDay, 0);
  });

  it('Selecting 5 days creates correct historical journey records', () => {
    const records = generatePrefeedRecords('EMP-001', 5, 'High');
    assert.strictEqual(records.length, 5);
    const days = records.map(r => r.journeyDay);
    assert.deepStrictEqual(days, [0, 1, 2, 3, 4]);
  });

  it('Complexity High generates higher deviation than Low', () => {
    const lowRecords = generatePrefeedRecords('EMP-001', 1, 'Low');
    const highRecords = generatePrefeedRecords('EMP-001', 1, 'High');
    
    // actualUnits should be lower for High
    assert.ok(highRecords[0].actualUnits! < lowRecords[0].actualUnits!);
    // errorCount should be higher for High
    assert.ok(highRecords[0].errorCount! > lowRecords[0].errorCount!);
  });

  it('Generated quantitative evidence respects targets', () => {
    const records = generatePrefeedRecords('EMP-001', 1, 'Medium');
    const evidence = normalizeLabRecord(records[0]);
    const volume = evidence.find(e => e.type === 'pick_volume');
    
    assert.strictEqual(volume?.context?.target, 60);
    assert.strictEqual(volume?.context?.target_operator, '>=');
    assert.strictEqual(volume?.unit, 'items/hour');
    
    // Verify provenance is included
    assert.strictEqual(volume?.context?.source_type, 'lab_prefeed');
    // Ensure no diagnosis label is generated natively
    assert.strictEqual(records[0].toolIssue, '');
  });
  
  it('Generated evidence contains no diagnosis label', () => {
    const records = generatePrefeedRecords('EMP-001', 1, 'Very High');
    // Even on very high, we don't output a diagnosis like "skill problem", we just output evidence like "Developing"
    assert.strictEqual(records[0].taskProficiency, 'Developing');
  });
});

describe('Learner State Derivation', () => {
  it('Learner State correctly derives fields and missing fields', () => {
    const record = {
      employeeId: 'EMP-001',
      journeyDay: 3,
      updatedAt: new Date().toISOString(),
      actualUnits: 58,
      timeTakenMinutes: 60,
      toolIssue: 'Scanner broken',
      shiftStatus: 'Present',
      errorCount: 2,
      accuracyPercentage: 98,
      taskProficiency: 'Developing',
      helpRequests: 1,
      workloadCondition: 'High'
    };
    
    const evidence = normalizeLabRecord(record);
    const state = deriveLearnerState('EMP-001', 3, evidence);
    
    // Performance
    assert.strictEqual(state.performance.productivity_actual, 58);
    assert.strictEqual(state.performance.productivity_target, 60);
    assert.strictEqual(state.performance.productivity_unit, 'items/hour');
    assert.strictEqual(state.performance.time_actual, 60);
    
    // Accuracy
    assert.strictEqual(state.accuracy.accuracy_actual, 98);
    assert.strictEqual(state.accuracy.error_count, 2);
    
    // Capability
    assert.strictEqual(state.capability.task_proficiency, 'Developing');
    
    // Attendance
    assert.strictEqual(state.attendance.shift_status, 'Present');
    
    // Support
    assert.strictEqual(state.support.help_requests, 1);
    
    // Environment
    assert.strictEqual(state.environment.workload_condition, 'High');
    // tool_status wasn't explicitly passed, toolIssue becomes tool_problem which is not in our state explicitly mapped, so tool_status should be undefined.
    assert.strictEqual(state.environment.tool_status, undefined);
    
    // Missing Evidence (we passed about 9 fields out of 18)
    assert.ok(state.evidence_quality.missing_fields_count > 0);
  });

  it('Not Available does not become a fabricated value', () => {
    const record = {
      employeeId: 'EMP-001',
      journeyDay: 1,
      updatedAt: new Date().toISOString(),
      trainingStatus: 'Not Available',
      toolStatus: 'Not Available'
    };
    
    const evidence = normalizeLabRecord(record);
    const state = deriveLearnerState('EMP-001', 1, evidence);
    
    assert.strictEqual(state.capability.training_status, undefined);
    assert.strictEqual(state.environment.tool_status, undefined);
  });

  it('Trend correctly identifies improving, declining, stable, and insufficient', () => {
    let records = [
      { employeeId: 'EMP-1', journeyDay: 1, updatedAt: 'a', actualUnits: 45 },
      { employeeId: 'EMP-1', journeyDay: 2, updatedAt: 'b', actualUnits: 49 },
      { employeeId: 'EMP-1', journeyDay: 3, updatedAt: 'c', actualUnits: 55 },
    ];
    let evidence = records.flatMap(normalizeLabRecord);
    let state = deriveLearnerState('EMP-1', 3, evidence);
    assert.strictEqual(state.trend, 'improving');
    
    records = [
      { employeeId: 'EMP-2', journeyDay: 1, updatedAt: 'a', actualUnits: 55 },
      { employeeId: 'EMP-2', journeyDay: 2, updatedAt: 'b', actualUnits: 51 },
      { employeeId: 'EMP-2', journeyDay: 3, updatedAt: 'c', actualUnits: 48 },
    ];
    evidence = records.flatMap(normalizeLabRecord);
    state = deriveLearnerState('EMP-2', 3, evidence);
    assert.strictEqual(state.trend, 'declining');
    
    records = [
      { employeeId: 'EMP-3', journeyDay: 1, updatedAt: 'a', actualUnits: 50 },
      { employeeId: 'EMP-3', journeyDay: 2, updatedAt: 'b', actualUnits: 50 },
      { employeeId: 'EMP-3', journeyDay: 3, updatedAt: 'c', actualUnits: 50 },
    ];
    evidence = records.flatMap(normalizeLabRecord);
    state = deriveLearnerState('EMP-3', 3, evidence);
    assert.strictEqual(state.trend, 'stable');
    
    records = [
      { employeeId: 'EMP-4', journeyDay: 1, updatedAt: 'a', actualUnits: 50 },
      { employeeId: 'EMP-4', journeyDay: 3, updatedAt: 'b', actualUnits: 60 },
    ];
    // only 1 day of history (Day 1) from the perspective of Day 3
    evidence = records.flatMap(normalizeLabRecord);
    state = deriveLearnerState('EMP-4', 3, evidence);
    assert.strictEqual(state.trend, 'insufficient_evidence');
  });

  it('Pre-fed evidence contributes to Learner State', () => {
    const records = generatePrefeedRecords('EMP-001', 3, 'Medium');
    const evidence = records.flatMap(normalizeLabRecord);
    // Examine Day 2 (3rd day)
    const state = deriveLearnerState('EMP-001', 2, evidence);
    
    assert.ok(state.performance.productivity_actual !== undefined);
    assert.ok(state.accuracy.error_count !== undefined);
    assert.strictEqual(state.evidence_quality.historical_days_available, 2);
    assert.ok(state.trend !== 'insufficient_evidence');
  });

  it('No diagnosis labels are produced in Learner State', () => {
    const record = {
      employeeId: 'EMP-001',
      journeyDay: 3,
      updatedAt: new Date().toISOString(),
      actualUnits: 20, // very low
      errorCount: 50, // very high
    };
    
    const evidence = normalizeLabRecord(record);
    const state = deriveLearnerState('EMP-001', 3, evidence);
    
    // Check that we didn't inject 'skill problem'
    const stateStr = JSON.stringify(state);
    assert.ok(!stateStr.includes('problem'));
    assert.ok(!stateStr.includes('issue'));
    assert.ok(!stateStr.includes('score')); // no readiness score
  });
});

import { adaptEvidenceToLoopInput } from '../services/evidenceAdapter.js';

describe('Evidence Adapter Translation', () => {
  it('maps identity, journey day, and metrics properly', () => {
    const canonical = [
      { id: '1', type: 'pick_volume', value: 120, subject_type: 'employee', subject_id: 'EMP-005', context: { target: 100 } },
      { id: '2', type: 'accuracy_score', value: 98, subject_type: 'employee', subject_id: 'EMP-005' },
      { id: '3', type: 'help_requests', value: 2, subject_type: 'employee', subject_id: 'EMP-005' }
    ] as any;

    const input = adaptEvidenceToLoopInput(canonical, 5, { id: 'EMP-005' }, null);

    assert.strictEqual(input.hire.id, 'EMP-005');
    assert.strictEqual(input.dayNumber, 5);
    assert.strictEqual(input.workSignal.actualPickRate, 120);
    assert.strictEqual(input.workSignal.targetPickRate, 100);
    assert.strictEqual(input.workSignal.accuracyRate, 98);
    assert.strictEqual(input.dailySignal.helpRequestsCount, 2);
  });

  it('does NOT inject diagnostic trigger words artificially', () => {
    const canonical = [
      { id: '1', type: 'tool_problem', value: 'Scanner broken', subject_type: 'employee', subject_id: 'EMP-005' },
      { id: '2', type: 'environment_issue', value: 'System downtime 45m', subject_type: 'employee', subject_id: 'EMP-005' },
      { id: '3', type: 'behavior_note', value: 'Working carelessly', subject_type: 'employee', subject_id: 'EMP-005' },
      { id: '4', type: 'accuracy_score', value: 92, subject_type: 'employee', subject_id: 'EMP-005' },
      { id: '5', type: 'help_requests', value: 8, subject_type: 'employee', subject_id: 'EMP-005' }
    ] as any;

    const input = adaptEvidenceToLoopInput(canonical, 5, { id: 'EMP-005' }, null);
    const rawText = input.dailySignal.rawText.toLowerCase();
    const notes = input.managerSignal.notes.toLowerCase();
    
    // It should map the actual values...
    assert.ok(rawText.includes('scanner broken'));
    assert.ok(rawText.includes('system downtime'));
    assert.ok(notes.includes('carelessly'));

    // ...but it MUST NOT manufacture the magic trigger words
    assert.ok(!rawText.includes('battery'));
    assert.ok(!rawText.includes('bluetooth'));
    assert.ok(!rawText.includes('power outage'));
    assert.ok(!rawText.includes('conveyor'));
    assert.ok(!rawText.includes('ppe'));
    assert.ok(!rawText.includes('hazard'));
    assert.ok(!rawText.includes('variant'));
    assert.ok(!rawText.includes('packaging'));
    assert.ok(!rawText.includes('unable to pick solo'));
    
    // Notes shouldn't have them either
    assert.ok(!notes.includes('ppe'));
    assert.ok(!notes.includes('hazard'));
  });

  it('does NOT call an LLM or assess readiness', () => {
     // Checking the pure synchronous nature of the function
     const canonical = [] as any;
     const input = adaptEvidenceToLoopInput(canonical, 1, {}, null);
     
     // Proof it returns the LoopExecutionInput shape synchronously
     assert.ok(input.workSignal !== undefined);
     assert.ok(input.managerSignal !== undefined);
     assert.ok((input as any).readinessScore === undefined); // No readiness calculation
     assert.ok((input as any).rootCause === undefined); // No root cause calculation
  });
});
