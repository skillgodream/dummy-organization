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
