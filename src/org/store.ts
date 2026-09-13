import { Employee, Shift, TaskLog, Observation, OrgEvent, LabDayRecord } from './models.js';

class OrgStore {
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
  }

  public saveTaskLog(log: TaskLog) {
    this.taskLogs.push(log);
  }

  public saveObservation(obs: Observation) {
    this.observations.push(obs);
  }

  public appendEvent(event: OrgEvent) {
    this.rawEvents.push(event);
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
  }

  public upsertLabRecord(record: LabDayRecord) {
    const existingIndex = this.labRecords.findIndex(r => r.employeeId === record.employeeId && r.journeyDay === record.journeyDay);
    if (existingIndex >= 0) {
      this.labRecords[existingIndex] = { ...this.labRecords[existingIndex], ...record };
    } else {
      this.labRecords.push(record);
    }
  }

  public clearLabRecord(employeeId: string, journeyDay: number) {
    this.labRecords = this.labRecords.filter(r => !(r.employeeId === employeeId && r.journeyDay === journeyDay));
  }

  public clearLabJourney(employeeId: string) {
    this.labRecords = this.labRecords.filter(r => r.employeeId !== employeeId);
  }
}

export const orgStore = new OrgStore();
