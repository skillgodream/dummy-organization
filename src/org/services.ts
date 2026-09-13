import { orgStore } from './store.js';
import { Shift, TaskLog, Observation, OrgEventType, OrgEvent } from './models.js';

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

function createEvent(eventType: OrgEventType, payload: any, timestamp?: string): OrgEvent {
  return {
    eventId: generateId('evt'),
    eventType,
    timestamp: timestamp || new Date().toISOString(),
    payload
  };
}

export const orgService = {
  startShift(employeeId: string, timestamp?: string): Shift {
    const shift: Shift = {
      id: generateId('sh'),
      employeeId,
      status: 'Active',
      startTime: timestamp || new Date().toISOString(),
    };
    orgStore.saveShift(shift);

    const event = createEvent('shift_started', { shift }, timestamp);
    orgStore.appendEvent(event);

    return shift;
  },

  completeShift(shiftId: string, timestamp?: string): Shift {
    const shift = orgStore.getShift(shiftId);
    if (!shift) throw new Error('Shift not found');
    if (shift.status === 'Completed') throw new Error('Shift already completed');

    shift.status = 'Completed';
    shift.endTime = timestamp || new Date().toISOString();
    orgStore.saveShift(shift);

    const event = createEvent('shift_completed', { shift }, timestamp);
    orgStore.appendEvent(event);

    return shift;
  },

  logPickBatch(shiftId: string, unitsProcessed: number, durationSeconds: number, errorCount: number, difficulty: 'Normal'|'High' = 'Normal', zone?: string, timestamp?: string): TaskLog {
    const shift = orgStore.getShift(shiftId);
    if (!shift || shift.status !== 'Active') throw new Error('Active shift not found');

    const taskLog: TaskLog = {
      id: generateId('tsk'),
      shiftId,
      type: 'Pick',
      unitsProcessed,
      durationSeconds,
      errorCount,
      difficulty,
      zone,
      timestamp: timestamp || new Date().toISOString(),
    };
    orgStore.saveTaskLog(taskLog);

    const event = createEvent('pick_batch_completed', { taskLog, employeeId: shift.employeeId }, timestamp);
    orgStore.appendEvent(event);

    return taskLog;
  },

  addObservation(supervisorId: string, employeeId: string, noteType: 'Praise' | 'Correction' | 'SkillIssue' | 'OperationalIssue', timestamp?: string): Observation {
    const obs: Observation = {
      id: generateId('obs'),
      supervisorId,
      employeeId,
      noteType,
      timestamp: timestamp || new Date().toISOString(),
    };
    orgStore.saveObservation(obs);

    const event = createEvent('supervisor_observation', { observation: obs }, timestamp);
    orgStore.appendEvent(event);

    return obs;
  },

  reportToolProblem(employeeId: string, tool: string, timestamp?: string) {
    const event = createEvent('tool_problem_reported', { employeeId, tool }, timestamp);
    orgStore.appendEvent(event);
  },

  requestHelp(employeeId: string, topic: string, timestamp?: string) {
    const event = createEvent('help_requested', { employeeId, topic }, timestamp);
    orgStore.appendEvent(event);
  },
  
  changeZone(employeeId: string, zone: string, timestamp?: string) {
    const event = createEvent('task_zone_changed', { employeeId, zone }, timestamp);
    orgStore.appendEvent(event);
  },

  failSkillAssessment(employeeId: string, skill: string, timestamp?: string) {
    const event = createEvent('skill_assessment_failed', { employeeId, skill }, timestamp);
    orgStore.appendEvent(event);
  }
};
