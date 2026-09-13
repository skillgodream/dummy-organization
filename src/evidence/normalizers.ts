import { CanonicalEvidence } from './contract.js';
import { OrgEvent } from '../org/models.js';

const SOURCE_SYSTEM = 'QuickCommerce_Simulator_v1';

export function normalizeEvent(event: OrgEvent): CanonicalEvidence[] {
  const evidenceList: CanonicalEvidence[] = [];

  switch (event.eventType) {
    case 'shift_started': {
      const shift = event.payload.shift;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_start`,
        subject_id: shift.employeeId,
        subject_type: 'employee',
        category: 'attendance',
        type: 'shift_start',
        timestamp: event.timestamp,
        value: 'active',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed',
        context: { shift_id: shift.id }
      });
      break;
    }
    
    case 'shift_completed': {
      const shift = event.payload.shift;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_end`,
        subject_id: shift.employeeId,
        subject_type: 'employee',
        category: 'attendance',
        type: 'shift_complete',
        timestamp: event.timestamp,
        value: 'completed',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed',
        context: { shift_id: shift.id }
      });
      
      // Derived Evidence: Shift Duration
      const start = new Date(shift.startTime).getTime();
      const end = new Date(shift.endTime!).getTime();
      const durationHours = (end - start) / (1000 * 60 * 60);

      evidenceList.push({
        evidence_id: `ev_${event.eventId}_duration`,
        subject_id: shift.employeeId,
        subject_type: 'employee',
        category: 'attendance',
        type: 'shift_duration',
        timestamp: event.timestamp,
        value: durationHours,
        unit: 'hours',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'derived',
        context: { shift_id: shift.id },
        derivation_metadata: {
          source_events: [event.eventId],
          logic: '(endTime - startTime) in hours'
        }
      });
      break;
    }

    case 'pick_batch_completed': {
      const task = event.payload.taskLog;
      const employeeId = event.payload.employeeId;
      
      // 1. Observed Evidence: Raw volume
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_volume`,
        subject_id: employeeId, 
        subject_type: 'employee',
        category: 'productivity',
        type: 'pick_volume',
        timestamp: event.timestamp,
        value: task.unitsProcessed,
        unit: 'units',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed',
        context: { task_id: task.id, shift_id: task.shiftId }
      });

      // 2. Observed Evidence: Errors
      if (task.errorCount > 0) {
        evidenceList.push({
          evidence_id: `ev_${event.eventId}_error`,
          subject_id: employeeId,
          subject_type: 'employee',
          category: 'quality',
          type: 'pick_error',
          timestamp: event.timestamp,
          value: task.errorCount,
          unit: 'errors',
          source_system: SOURCE_SYSTEM,
          confidence_score: 1.0,
          evidence_kind: 'observed',
          context: { task_id: task.id, shift_id: task.shiftId }
        });
      }

      // 3. Derived Evidence: Velocity
      const velocity = (task.unitsProcessed / task.durationSeconds) * 3600; // units per hour
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_velocity`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'productivity',
        type: 'pick_velocity',
        timestamp: event.timestamp,
        value: velocity,
        unit: 'units_per_hour',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'derived',
        context: { task_id: task.id, shift_id: task.shiftId },
        derivation_metadata: {
          source_events: [event.eventId],
          logic: '(unitsProcessed / durationSeconds) * 3600'
        }
      });
      break;
    }

    case 'supervisor_observation': {
      const obs = event.payload.observation;
      let category: 'quality' | 'productivity' | 'learning' = 'quality';
      if (obs.noteType === 'SkillIssue') category = 'learning';
      else if (obs.noteType === 'OperationalIssue') category = 'productivity';

      evidenceList.push({
        evidence_id: `ev_${event.eventId}_obs`,
        subject_id: obs.employeeId,
        subject_type: 'employee',
        category: category,
        type: 'supervisor_note',
        timestamp: event.timestamp,
        value: obs.noteType,
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'reported',
        context: { 
          observation_id: obs.id,
          supervisor_id: obs.supervisorId 
        }
      });
      break;
    }

    case 'tool_problem_reported': {
      const { employeeId, tool } = event.payload;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_prob`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'environment',
        type: 'tool_problem',
        timestamp: event.timestamp,
        value: tool || 'reported',
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'reported',
      });
      break;
    }
    
    case 'help_requested': {
      const { employeeId, topic } = event.payload;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_help`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'support',
        type: 'help_request',
        timestamp: event.timestamp,
        value: topic,
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed'
      });
      break;
    }

    case 'task_zone_changed': {
      const { employeeId, zone } = event.payload;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_zone`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'environment',
        type: 'zone_change',
        timestamp: event.timestamp,
        value: zone,
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed'
      });
      break;
    }

    case 'training_completed': {
      const { employeeId, course } = event.payload;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_train`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'learning',
        type: 'training_completed',
        timestamp: event.timestamp,
        value: course,
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed'
      });
      break;
    }

    case 'skill_assessment_failed': {
      const { employeeId, skill } = event.payload;
      evidenceList.push({
        evidence_id: `ev_${event.eventId}_skillfail`,
        subject_id: employeeId,
        subject_type: 'employee',
        category: 'learning',
        type: 'skill_assessment_failed',
        timestamp: event.timestamp,
        value: skill,
        source_system: SOURCE_SYSTEM,
        confidence_score: 1.0,
        evidence_kind: 'observed'
      });
      break;
    }
  }

  return evidenceList;
}
