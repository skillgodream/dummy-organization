import { CanonicalEvidence } from './contract.js';
import { LabDayRecord } from '../org/models.js';
import { LAB_TARGETS } from '../org/targets.js';

const SOURCE_SYSTEM = 'QuickCommerce_Lab_v1';

export function normalizeLabRecord(record: LabDayRecord): CanonicalEvidence[] {
  const evidenceList: CanonicalEvidence[] = [];
  const baseTimestamp = record.updatedAt || new Date().toISOString();
  
  const addEvidence = (category: any, type: string, value: any, kind: any = 'reported', unit?: string, targetKey?: keyof typeof LAB_TARGETS) => {
    const context: any = { journey_day: record.journeyDay };
    
    if (record.sourceType) {
      context.source_type = record.sourceType;
    }
    
    if (targetKey && LAB_TARGETS[targetKey]) {
      context.target = LAB_TARGETS[targetKey].target;
      context.target_operator = LAB_TARGETS[targetKey].operator;
      if (!unit) unit = LAB_TARGETS[targetKey].unit;
    }

    evidenceList.push({
      evidence_id: `ev_lab_${record.employeeId}_d${record.journeyDay}_${type}`,
      subject_id: record.employeeId,
      subject_type: 'employee',
      category,
      type,
      timestamp: baseTimestamp,
      value,
      unit,
      source_system: SOURCE_SYSTEM,
      confidence_score: 1.0,
      evidence_kind: kind,
      context
    });
  };

  // Section A - Work
  if (record.actualUnits !== undefined && record.actualUnits !== null && record.actualUnits !== -1) {
    addEvidence('productivity', 'pick_volume', record.actualUnits, 'observed', undefined, 'actualUnits');
  }
  if (record.expectedUnits !== undefined && record.expectedUnits !== null && record.expectedUnits !== -1) {
    addEvidence('productivity', 'expected_volume', record.expectedUnits, 'reported', 'units');
  }
  if (record.timeTakenMinutes !== undefined && record.timeTakenMinutes !== null && record.timeTakenMinutes !== -1) {
    addEvidence('attendance', 'time_taken', record.timeTakenMinutes, 'observed', undefined, 'timeTakenMinutes');
    if (record.actualUnits !== undefined && record.actualUnits !== null && record.actualUnits !== -1 && record.timeTakenMinutes > 0) {
      addEvidence('productivity', 'pick_velocity', (record.actualUnits / record.timeTakenMinutes) * 60, 'derived', 'units_per_hour');
    }
  }
  if (record.taskType) addEvidence('environment', 'task_type', record.taskType, 'observed');
  if (record.shiftStatus && record.shiftStatus !== 'Not Available') addEvidence('attendance', 'shift_status', record.shiftStatus, 'reported');

  // Section B - Accuracy
  if (record.errorCount !== undefined && record.errorCount !== null && record.errorCount !== -1) {
    addEvidence('quality', 'error_count', record.errorCount, 'observed', undefined, 'errorCount');
  }
  if (record.accuracyPercentage !== undefined && record.accuracyPercentage !== null && record.accuracyPercentage !== -1) {
    addEvidence('quality', 'accuracy_score', record.accuracyPercentage, 'observed', undefined, 'accuracyPercentage');
  }

  // Section C - Attendance
  if (record.attendanceStatus && record.attendanceStatus !== 'Not Available') addEvidence('attendance', 'attendance_status', record.attendanceStatus, 'observed');
  if (record.lateMinutes !== undefined && record.lateMinutes !== null && record.lateMinutes !== -1) {
    addEvidence('attendance', 'late_minutes', record.lateMinutes, 'observed', 'minutes');
  }
  if (record.shiftCompleted && record.shiftCompleted !== 'Not Available') {
    addEvidence('attendance', 'shift_completed', record.shiftCompleted, 'observed');
  }

  // Section D - Skill / Learning
  if (record.taskProficiency && record.taskProficiency !== 'Not Available') addEvidence('learning', 'task_proficiency', record.taskProficiency, 'reported');
  if (record.trainingStatus && record.trainingStatus !== 'Not Available') {
    addEvidence('learning', 'training_status', record.trainingStatus, 'reported');
  }
  if (record.assessmentScore !== undefined && record.assessmentScore !== null && record.assessmentScore !== -1) {
    addEvidence('learning', 'assessment_score', record.assessmentScore, 'observed', undefined, 'assessmentScore');
  }
  if (record.newTaskExposure && record.newTaskExposure !== 'Not Available') {
    addEvidence('learning', 'new_task_exposure', record.newTaskExposure, 'observed');
  }

  // Section E - Support
  if (record.helpRequests !== undefined && record.helpRequests !== null && record.helpRequests !== -1) {
    addEvidence('support', 'help_requests', record.helpRequests, 'observed', undefined, 'helpRequests');
  }
  if (record.supervisorAssistance && record.supervisorAssistance !== 'Not Available') {
    addEvidence('support', 'supervisor_assistance', record.supervisorAssistance, 'reported');
  }
  if (record.escalationCount !== undefined && record.escalationCount !== null && record.escalationCount !== -1) {
    addEvidence('support', 'escalation_count', record.escalationCount, 'observed', 'count');
  }

  // Section F - Tool / System
  if (record.toolStatus && record.toolStatus !== 'Not Available') addEvidence('environment', 'tool_status', record.toolStatus, 'reported');
  if (record.toolIssue) addEvidence('environment', 'tool_problem', record.toolIssue, 'reported');
  if (record.downtimeMinutes !== undefined && record.downtimeMinutes !== null && record.downtimeMinutes !== -1) {
    addEvidence('environment', 'system_downtime', record.downtimeMinutes, 'observed', undefined, 'downtimeMinutes');
  }

  // Section G - Environment
  if (record.workloadCondition && record.workloadCondition !== 'Not Available') addEvidence('environment', 'workload_condition', record.workloadCondition, 'reported');
  if (record.congestionIssue) addEvidence('environment', 'congestion_issue', record.congestionIssue, 'reported');
  if (record.environmentIssue) addEvidence('environment', 'environment_issue', record.environmentIssue, 'reported');

  // Section H - Human Observation
  if (record.supervisorObservation) addEvidence('quality', 'supervisor_note', record.supervisorObservation, 'reported');
  if (record.behaviorObservation) addEvidence('learning', 'behavior_note', record.behaviorObservation, 'reported');
  if (record.communicationObservation) addEvidence('support', 'communication_note', record.communicationObservation, 'reported');

  return evidenceList;
}
