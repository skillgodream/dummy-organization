import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
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

  private storageFilePath: string = path.resolve(process.cwd(), '.data', 'deancore_store.json');
  private savePromise: Promise<void> | null = null;
  private isSavePending: boolean = false;
  private isLoaded: boolean = false;

  constructor() {
    this.loadSync();
  }

  private getKvConfig(): { url: string, token: string } | null {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.VERCEL_KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VERCEL_KV_REST_API_TOKEN;
    if (url && token) {
      return { url, token };
    }
    return null;
  }

  public loadSync(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        if (raw) {
          const snapshot: StoreSnapshot = JSON.parse(raw);
          this.applySnapshot(snapshot);
        }
      }
    } catch (e) {
      // Ignore initial sync load errors if file is unreadable
    }
  }

  public async load(force: boolean = false): Promise<void> {
    if (this.isLoaded && !force) {
      return;
    }

    if (this.savePromise) {
      await this.savePromise;
    }

    const kv = this.getKvConfig();
    if (kv) {
      try {
        const redis = new Redis({ url: kv.url, token: kv.token });
        const raw = await redis.get<StoreSnapshot | string>('deancore_org_store');
        if (raw) {
          let snapshot: StoreSnapshot | null = null;
          if (typeof raw === 'string') {
            snapshot = JSON.parse(raw);
          } else if (typeof raw === 'object') {
            snapshot = raw as StoreSnapshot;
          }
          if (snapshot) {
            this.applySnapshot(snapshot);
            this.isLoaded = true;
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load store from Vercel KV:', e);
      }
    }

    this.loadSync();
    this.isLoaded = true;
  }

  public async save(): Promise<void> {
    if (this.savePromise) {
      this.isSavePending = true;
      await this.savePromise;
      if (this.isSavePending) {
        return this.save();
      }
      return;
    }

    this.savePromise = (async () => {
      this.isSavePending = false;
      const snapshot = this.getSnapshot();

      // 1. Sync to disk file for local fallback & dev persistence
      try {
        const dir = path.dirname(this.storageFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.storageFilePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      } catch (e) {
        // Ignore filesystem write errors on read-only serverless filesystems
      }

      // 2. Sync to Vercel KV REST API if configured
      const kv = this.getKvConfig();
      if (kv) {
        try {
          const redis = new Redis({ url: kv.url, token: kv.token });
          await redis.set('deancore_org_store', snapshot);
        } catch (e) {
          console.warn('Failed to save store to Vercel KV:', e);
        }
      }
    })();

    try {
      await this.savePromise;
    } finally {
      this.savePromise = null;
    }
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
