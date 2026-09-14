import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Employee, Shift, TaskLog, Observation, OrgEvent, LabDayRecord } from './models.js';

export interface StoreSnapshot {
  shifts: Shift[];
  taskLogs: TaskLog[];
  observations: Observation[];
  rawEvents: OrgEvent[];
  labRecords: LabDayRecord[];
  hasInitialized?: boolean;
}

export class OrgStore {
  public employees: Employee[] = [
    { id: 'EMP-001', name: 'Rahul', role: 'Picker' },
    { id: 'EMP-002', name: 'Priya', role: 'Picker' },
    { id: 'EMP-003', name: 'Amit', role: 'Picker' },
    { id: 'EMP-004', name: 'Diana', role: 'Picker' },
    { id: 'EMP-999', name: 'System Supervisor', role: 'Supervisor' }
  ];
  public shifts: Shift[] = [];
  public taskLogs: TaskLog[] = [];
  public observations: Observation[] = [];
  
  public rawEvents: OrgEvent[] = [];
  public labRecords: LabDayRecord[] = [];
  public hasInitialized: boolean = false;
  private isLoaded: boolean = false;

  constructor() {
    this.load();
  }

  public async load(force: boolean = false): Promise<void> {
    if (this.isLoaded && !force) return;

    try {
      const docRef = doc(db, "store", "deancore_org_store");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const snapshot = docSnap.data() as StoreSnapshot;
        this.applySnapshot(snapshot);
      }
    } catch (e) {
      console.warn('Failed to load store from Firestore:', e);
    }
    
    this.isLoaded = true;
  }

  public async save(): Promise<void> {
    const snapshot = this.getSnapshot();
    try {
      const docRef = doc(db, "store", "deancore_org_store");
      await setDoc(docRef, snapshot);
    } catch (e) {
      console.warn('Failed to save store to Firestore:', e);
    }
  }

  private clearDataInternal() {
    this.shifts = [];
    this.taskLogs = [];
    this.observations = [];
    this.rawEvents = [];
    this.labRecords = [];
    this.hasInitialized = false;
  }


  private getSnapshot(): StoreSnapshot {
    return {
      shifts: this.shifts,
      taskLogs: this.taskLogs,
      observations: this.observations,
      rawEvents: this.rawEvents,
      labRecords: this.labRecords,
      hasInitialized: this.hasInitialized
    };
  }

  private applySnapshot(snapshot: Partial<StoreSnapshot>) {
    if (Array.isArray(snapshot.shifts)) this.shifts = snapshot.shifts;
    if (Array.isArray(snapshot.taskLogs)) this.taskLogs = snapshot.taskLogs;
    if (Array.isArray(snapshot.observations)) this.observations = snapshot.observations;
    if (Array.isArray(snapshot.rawEvents)) this.rawEvents = snapshot.rawEvents;
    if (Array.isArray(snapshot.labRecords)) this.labRecords = snapshot.labRecords;
    if (typeof snapshot.hasInitialized === 'boolean') {
      this.hasInitialized = snapshot.hasInitialized;
    } else if (this.labRecords.length > 0 || this.rawEvents.length > 0) {
      this.hasInitialized = true;
    }
  }

  public getEmployee(id: string): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  public getShift(id: string): Shift | undefined {
    return this.shifts.find(s => s.id === id);
  }

  public saveShift(shift: Shift) {
    const existingIndex = this.shifts.findIndex(s => s.id === shift.id);
    if (existingIndex >= 0) {
      this.shifts[existingIndex] = shift;
    } else {
      this.shifts.push(shift);
    }
    this.save();
  }

  public saveTaskLog(log: TaskLog) {
    this.taskLogs.push(log);
    this.save();
  }

  public saveObservation(obs: Observation) {
    this.observations.push(obs);
    this.save();
  }

  public appendEvent(event: OrgEvent) {
    this.rawEvents.push(event);
    this.save();
  }

  public getEventsSince(timestamp?: string, limit?: number): OrgEvent[] {
    let filtered = this.rawEvents;
    if (timestamp) {
      filtered = filtered.filter(e => e.timestamp >= timestamp);
    }
    
    filtered = filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }
  
  public clearData() {
    this.shifts = [];
    this.taskLogs = [];
    this.observations = [];
    this.rawEvents = [];
    this.labRecords = [];
    this.hasInitialized = false;
    this.save();
  }

  public upsertLabRecord(record: LabDayRecord) {
    const existingIndex = this.labRecords.findIndex(r => r.employeeId === record.employeeId && r.journeyDay === record.journeyDay);
    if (existingIndex >= 0) {
      this.labRecords[existingIndex] = { ...this.labRecords[existingIndex], ...record };
    } else {
      this.labRecords.push(record);
    }
    this.save();
  }

  public recordActionOutcome(employeeId: string, journeyDay: number, outcome: { improved: 'yes' | 'partial' | 'no'; notes?: string; action_type?: string; supervisor_id?: string; timestamp?: string }): { record: LabDayRecord; adjustedFutureDays: number } {
    const existingIndex = this.labRecords.findIndex(r => r.employeeId === employeeId && r.journeyDay === journeyDay);
    let targetRecord: LabDayRecord;

    if (existingIndex >= 0) {
      targetRecord = {
        ...this.labRecords[existingIndex],
        updatedAt: new Date().toISOString(),
        actionOutcome: {
          improved: outcome.improved,
          notes: outcome.notes || this.labRecords[existingIndex].actionOutcome?.notes || '',
          action_type: outcome.action_type || this.labRecords[existingIndex].actionOutcome?.action_type || 'supervisor_checkin',
          supervisor_id: outcome.supervisor_id || this.labRecords[existingIndex].actionOutcome?.supervisor_id || 'supervisor',
          timestamp: outcome.timestamp || new Date().toISOString()
        }
      };
      this.labRecords[existingIndex] = targetRecord;
    } else {
      targetRecord = {
        employeeId,
        journeyDay,
        updatedAt: new Date().toISOString(),
        sourceType: 'action_outcome_ingest',
        taskType: 'Standard Pick',
        expectedUnits: 60,
        actualUnits: outcome.improved === 'yes' ? 58 : (outcome.improved === 'partial' ? 48 : 36),
        timeTakenMinutes: 60,
        shiftStatus: 'Present',
        errorCount: outcome.improved === 'yes' ? 1 : (outcome.improved === 'partial' ? 3 : 5),
        accuracyPercentage: outcome.improved === 'yes' ? 98.3 : (outcome.improved === 'partial' ? 93.8 : 86.1),
        attendanceStatus: 'Present',
        taskProficiency: outcome.improved === 'yes' ? 'Competent' : 'Developing',
        trainingStatus: 'Completed',
        assessmentScore: outcome.improved === 'yes' ? 95 : 80,
        helpRequests: outcome.improved === 'yes' ? 1 : 3,
        toolStatus: 'Normal',
        actionOutcome: {
          improved: outcome.improved,
          notes: outcome.notes || '',
          action_type: outcome.action_type || 'supervisor_checkin',
          supervisor_id: outcome.supervisor_id || 'supervisor',
          timestamp: outcome.timestamp || new Date().toISOString()
        }
      };
      this.labRecords.push(targetRecord);
    }

    // Dynamic recovery propagation: adjust post-intervention shift telemetry for subsequent days
    let adjustedFutureDays = 0;
    if (outcome.improved === 'yes' || outcome.improved === 'partial') {
      const isFull = outcome.improved === 'yes';
      
      this.labRecords = this.labRecords.map(r => {
        if (r.employeeId === employeeId && r.journeyDay > journeyDay) {
          adjustedFutureDays++;
          const dayOffset = r.journeyDay - journeyDay;
          // Ramp velocity upwards to reflect recovery (e.g. 58-64+ UPH) instead of repeating failure baseline
          const targetUnits = isFull ? Math.min(68, 58 + (dayOffset * 2)) : Math.min(56, 48 + (dayOffset * 1));
          const targetErrors = isFull ? Math.max(0, Math.min(2, 2 - Math.floor(dayOffset / 2))) : Math.max(1, 3 - Math.floor(dayOffset / 3));
          const targetAcc = targetUnits > 0 ? parseFloat((((targetUnits - targetErrors) / targetUnits) * 100).toFixed(1)) : 98.0;

          return {
            ...r,
            actualUnits: targetUnits,
            errorCount: targetErrors,
            accuracyPercentage: targetAcc,
            taskProficiency: isFull ? 'Competent' : (r.taskProficiency || 'Developing'),
            toolStatus: 'Normal',
            toolIssue: '',
            downtimeMinutes: 0,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });
    }

    this.save();
    return { record: targetRecord, adjustedFutureDays };
  }

  public clearLabRecord(employeeId: string, journeyDay: number) {
    this.labRecords = this.labRecords.filter(r => !(r.employeeId === employeeId && r.journeyDay === journeyDay));
    this.save();
  }

  public clearLabJourney(employeeId: string) {
    this.labRecords = this.labRecords.filter(r => r.employeeId !== employeeId);
    this.save();
  }
}

export const orgStore = new OrgStore();
