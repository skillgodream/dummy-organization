export interface Employee {
  id: string;
  name: string;
  role: 'Picker' | 'Supervisor';
}

export interface Shift {
  id: string;
  employeeId: string;
  status: 'Active' | 'Completed';
  startTime: string; // ISO datetime
  endTime?: string;
}

export interface TaskLog {
  id: string;
  shiftId: string;
  type: 'Pick' | 'Stash' | 'Audit';
  unitsProcessed: number;
  durationSeconds: number;
  errorCount: number;
  difficulty?: 'Normal' | 'High';
  zone?: string;
  timestamp: string; // ISO datetime
}

export interface Observation {
  id: string;
  supervisorId: string;
  employeeId: string;
  noteType: 'Praise' | 'Correction' | 'SkillIssue' | 'OperationalIssue';
  timestamp: string; // ISO datetime
}

export interface HelpRequest {
  id: string;
  employeeId: string;
  topic: string;
  timestamp: string;
}

export interface ActionOutcome {
  improved: 'yes' | 'partial' | 'no';
  notes?: string;
  action_type?: string;
  supervisor_id?: string;
  timestamp?: string;
}

export interface LabDayRecord {
  employeeId: string;
  journeyDay: number; // 0 to 10
  updatedAt: string;
  sourceType?: string;
  actionOutcome?: ActionOutcome;

  // Section A - Work
  taskType?: string;
  expectedUnits?: number;
  actualUnits?: number;
  timeTakenMinutes?: number;
  shiftStatus?: string;

  // Section B - Accuracy
  errorCount?: number;
  accuracyPercentage?: number;

  // Section C - Attendance
  attendanceStatus?: string;
  lateMinutes?: number;
  shiftCompleted?: string;

  // Section D - Skill / Learning
  taskProficiency?: string;
  trainingStatus?: string;
  assessmentScore?: number;
  newTaskExposure?: string;

  // Section E - Support
  helpRequests?: number;
  supervisorAssistance?: string;
  escalationCount?: number;

  // Section F - Tool / System
  toolStatus?: string;
  toolIssue?: string;
  downtimeMinutes?: number;

  // Section G - Environment
  workloadCondition?: string;
  congestionIssue?: string;
  environmentIssue?: string;

  // Section H - Human Observation
  supervisorObservation?: string;
  behaviorObservation?: string;
  communicationObservation?: string;
}

// Raw Events - internal to the organization
export type OrgEventType = 
  | 'shift_started' 
  | 'shift_completed' 
  | 'pick_batch_completed' 
  | 'supervisor_observation'
  | 'tool_problem_reported'
  | 'help_requested'
  | 'task_zone_changed'
  | 'training_completed'
  | 'skill_assessment_failed';

export interface OrgEvent {
  eventId: string;
  eventType: OrgEventType;
  timestamp: string;
  payload: any;
}
