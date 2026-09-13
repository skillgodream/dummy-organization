import { CanonicalEvidence } from './contract.js';

export interface LearnerState {
  employee_id: string;
  journey_day: number;
  performance: {
    productivity_actual?: number;
    productivity_target?: number;
    productivity_unit?: string;
    productivity_operator?: string;
    time_actual?: number;
    time_target?: number;
  };
  accuracy: {
    accuracy_actual?: number;
    accuracy_target?: number;
    accuracy_unit?: string;
    accuracy_operator?: string;
    error_count?: number;
    error_target?: number;
    status: 'observed' | 'calculated' | 'unavailable';
  };
  capability: {
    task_proficiency?: string;
    new_task_exposure?: string;
    training_status?: string;
    assessment?: number;
  };
  attendance: {
    shift_status?: string;
    attendance_status?: string;
    shift_completed?: string;
    late_minutes?: number;
  };
  support: {
    help_requests?: number;
    escalation_count?: number;
    supervisor_assistance?: string;
  };
  environment: {
    tool_status?: string;
    workload_condition?: string;
    downtime?: number;
  };
  evidence_quality: {
    historical_days_available: number;
    missing_fields_count: number;
    latest_evidence_timestamp?: string;
  };
  trend: 'improving' | 'stable' | 'declining' | 'fluctuating' | 'insufficient_evidence';
}

export function deriveLearnerState(
  employeeId: string, 
  currentDay: number, 
  allEvidence: CanonicalEvidence[]
): LearnerState {
  const currentState: LearnerState = {
    employee_id: employeeId,
    journey_day: currentDay,
    performance: {},
    accuracy: { status: 'unavailable' },
    capability: {},
    attendance: {},
    support: {},
    environment: {},
    evidence_quality: {
      historical_days_available: 0,
      missing_fields_count: 0
    },
    trend: 'insufficient_evidence'
  };

  const currentDayEvidence = allEvidence.filter(e => e.context?.journey_day === currentDay);
  
  if (currentDayEvidence.length === 0) {
    currentState.evidence_quality.missing_fields_count = 18; 
    return currentState;
  }

  const latestTimestamp = currentDayEvidence.reduce((latest, ev) => {
    return !latest || new Date(ev.timestamp) > new Date(latest) ? ev.timestamp : latest;
  }, undefined as string | undefined);
  currentState.evidence_quality.latest_evidence_timestamp = latestTimestamp;

  for (const ev of currentDayEvidence) {
    switch (ev.type) {
      case 'pick_volume':
        currentState.performance.productivity_actual = ev.value;
        currentState.performance.productivity_target = ev.context?.target;
        currentState.performance.productivity_unit = ev.unit || ev.context?.unit;
        currentState.performance.productivity_operator = ev.context?.target_operator;
        break;
      case 'time_taken':
        currentState.performance.time_actual = ev.value;
        currentState.performance.time_target = ev.context?.target;
        break;
      case 'error_count':
        currentState.accuracy.error_count = ev.value;
        currentState.accuracy.error_target = ev.context?.target;
        if (currentState.accuracy.status !== 'observed') {
            currentState.accuracy.status = 'calculated';
        }
        break;
      case 'accuracy_score':
        currentState.accuracy.accuracy_actual = ev.value;
        currentState.accuracy.accuracy_target = ev.context?.target;
        currentState.accuracy.accuracy_unit = ev.unit || ev.context?.unit;
        currentState.accuracy.accuracy_operator = ev.context?.target_operator;
        currentState.accuracy.status = 'observed';
        break;
      case 'task_proficiency':
        currentState.capability.task_proficiency = ev.value;
        break;
      case 'new_task_exposure':
        currentState.capability.new_task_exposure = ev.value;
        break;
      case 'training_status':
        currentState.capability.training_status = ev.value;
        break;
      case 'assessment_score':
        currentState.capability.assessment = ev.value;
        break;
      case 'shift_status':
        currentState.attendance.shift_status = ev.value;
        break;
      case 'attendance_status':
        currentState.attendance.attendance_status = ev.value;
        break;
      case 'shift_completed':
        currentState.attendance.shift_completed = ev.value;
        break;
      case 'late_minutes':
        currentState.attendance.late_minutes = ev.value;
        break;
      case 'help_requests':
        currentState.support.help_requests = ev.value;
        break;
      case 'escalation_count':
        currentState.support.escalation_count = ev.value;
        break;
      case 'supervisor_assistance':
        currentState.support.supervisor_assistance = ev.value;
        break;
      case 'tool_status':
        currentState.environment.tool_status = ev.value;
        break;
      case 'workload_condition':
        currentState.environment.workload_condition = ev.value;
        break;
      case 'system_downtime':
        currentState.environment.downtime = ev.value;
        break;
    }
  }

  const expectedFields = [
    currentState.performance.productivity_actual,
    currentState.performance.time_actual,
    currentState.accuracy.error_count,
    currentState.accuracy.accuracy_actual,
    currentState.capability.task_proficiency,
    currentState.capability.new_task_exposure,
    currentState.capability.training_status,
    currentState.capability.assessment,
    currentState.attendance.shift_status,
    currentState.attendance.attendance_status,
    currentState.attendance.shift_completed,
    currentState.attendance.late_minutes,
    currentState.support.help_requests,
    currentState.support.escalation_count,
    currentState.support.supervisor_assistance,
    currentState.environment.tool_status,
    currentState.environment.workload_condition,
    currentState.environment.downtime
  ];
  currentState.evidence_quality.missing_fields_count = expectedFields.filter(f => f === undefined).length;

  const historyDays = new Set(allEvidence.map(e => e.context?.journey_day).filter(d => d !== undefined && d < currentDay));
  currentState.evidence_quality.historical_days_available = historyDays.size;

  if (currentState.evidence_quality.historical_days_available >= 2 && currentState.performance.productivity_actual !== undefined) {
      const pastProds: {day: number, val: number}[] = [];
      for (const day of Array.from(historyDays).sort((a,b)=>b-a)) {
        const pEv = allEvidence.find(e => e.context?.journey_day === day && e.type === 'pick_volume');
        if (pEv && pEv.value !== undefined) {
           pastProds.push({day, val: pEv.value});
        }
        if (pastProds.length === 2) break;
      }
      
      if (pastProds.length === 2) {
          const [prev1, prev2] = pastProds; 
          const current = currentState.performance.productivity_actual;
          
          if (current > prev1.val && prev1.val >= prev2.val) currentState.trend = 'improving';
          else if (current < prev1.val && prev1.val <= prev2.val) currentState.trend = 'declining';
          else if (current === prev1.val && prev1.val === prev2.val) currentState.trend = 'stable';
          else currentState.trend = 'fluctuating';
      }
  }

  return currentState;
}
