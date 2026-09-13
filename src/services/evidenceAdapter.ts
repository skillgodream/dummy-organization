import { CanonicalEvidence } from '../evidence/contract.js';

export interface DailySignal {
  rawText: string;
  issue: string;
  category: string;
  helpRequestsCount: number;
}

export interface ManagerSignal {
  state: string;
  issueCategory: string;
  notes: string;
}

export interface WorkSignal {
  actualPickRate: number;
  targetPickRate: number;
  accuracyRate: number;
  ordersCompleted: number;
  externalBottleneck: string;
}

export interface ActionOutcome {
  improved: boolean | 'partial' | 'no';
  treatmentContext: string;
}

export interface LoopExecutionInput {
  hire: any;
  dayNumber: number;
  dailySignal: DailySignal;
  managerSignal: ManagerSignal;
  workSignal: WorkSignal;
  actionOutcome: ActionOutcome;
  previousRecord?: any;
}

/**
 * Adapter to fetch Canonical Evidence from the Simulator API and 
 * translate it into the legacy LoopExecutionInput expected by the Six Doctors.
 * 
 * MUST contain zero diagnostic logic.
 * MUST not update learner state.
 * MUST not call the LLM.
 */
export async function fetchAndAdaptEvidence(
  employeeId: string,
  dayNumber: number,
  hire: any,
  previousRecord: any,
  apiBaseUrl: string = '' // Allow overriding for cross-origin if needed
): Promise<LoopExecutionInput> {
  // 1. Fetch Canonical Evidence from Simulator API
  const response = await fetch(`${apiBaseUrl}/api/v1/evidence?employeeId=${employeeId}&journeyDay=${dayNumber}`);
  if (!response.ok) {
    throw new Error('Failed to fetch canonical evidence');
  }
  const result = await response.json();
  const evidence: CanonicalEvidence[] = result.data || [];

  // 2. Map to LoopExecutionInput
  return adaptEvidenceToLoopInput(evidence, dayNumber, hire, previousRecord);
}

export function adaptEvidenceToLoopInput(
  evidence: CanonicalEvidence[],
  dayNumber: number,
  hire: any,
  previousRecord: any
): LoopExecutionInput {
  
  // Default structure
  const input: LoopExecutionInput = {
    hire,
    dayNumber,
    dailySignal: {
      rawText: '',
      issue: 'None',
      category: 'Normal',
      helpRequestsCount: 0
    },
    managerSignal: {
      state: 'Normal',
      issueCategory: 'None',
      notes: ''
    },
    workSignal: {
      actualPickRate: 0,
      targetPickRate: 0,
      accuracyRate: 0,
      ordersCompleted: 0,
      externalBottleneck: 'None'
    },
    actionOutcome: {
      improved: 'no',
      treatmentContext: ''
    },
    previousRecord
  };

  // Map Evidence
  let toolProblemStr = '';
  let envIssueStr = '';
  let behaviorNote = '';
  let commNote = '';
  let supNote = '';

  for (const ev of evidence) {
    switch (ev.type) {
      case 'pick_volume':
      case 'pick_velocity': // Prefer volume or velocity based on your system's canonical form
        // In the legacy system, actualPickRate usually represents UPH (velocity) or total units. We'll map value.
        input.workSignal.actualPickRate = ev.value;
        if (ev.context?.target) input.workSignal.targetPickRate = ev.context.target;
        break;
        
      case 'accuracy_score':
        input.workSignal.accuracyRate = ev.value;
        break;
        
      case 'error_count':
        // Legacy system might care about total errors, but WorkSignal mostly uses accuracyRate
        break;

      case 'help_requests':
        input.dailySignal.helpRequestsCount = ev.value;
        break;
        
      case 'tool_status':
        if (ev.value === 'Failed' || ev.value === 'Intermittent') {
           input.dailySignal.category = 'Hardware';
           input.dailySignal.issue = 'Tool Issue';
        }
        break;
        
      case 'tool_problem':
        toolProblemStr = String(ev.value).toLowerCase();
        break;

      case 'environment_issue':
      case 'congestion_issue':
      case 'system_downtime':
        envIssueStr += ` ${ev.value}`;
        break;

      case 'task_proficiency':
        // Map proficiency to manager signal state if appropriate
        input.managerSignal.state = ev.value;
        break;

      case 'supervisor_note':
        supNote = String(ev.value);
        break;

      case 'behavior_note':
        behaviorNote = String(ev.value);
        break;

      case 'communication_note':
        commNote = String(ev.value);
        break;
    }
  }

  // --- Pure Translation ---
  // We ONLY include exactly what was in the canonical evidence.
  // We DO NOT inject keywords (like 'battery', 'bluetooth', 'power outage', etc.)
  // if they aren't explicitly provided by the source.
  
  let synthesizedRawText = [];
  
  if (toolProblemStr) {
    synthesizedRawText.push(`Hardware issue: ${toolProblemStr}.`);
  }

  if (envIssueStr.trim()) {
    input.workSignal.externalBottleneck = 'Yes'; // Still mapping structural meaning based on presence of env/downtime issue
    synthesizedRawText.push(`Environment issue: ${envIssueStr.trim()}.`);
  }

  input.dailySignal.rawText = synthesizedRawText.join(' ');
  
  input.managerSignal.notes = [supNote, behaviorNote, commNote].filter(Boolean).join(' | ');

  // Outcome Mapping (if intervention result is present in canonical evidence, 
  // though typically it would be a specific event type like 'intervention_result')
  const outcomeEv = evidence.find(e => e.type === 'intervention_result');
  if (outcomeEv) {
    input.actionOutcome.improved = outcomeEv.value === 'improved' ? true : 
                                   outcomeEv.value === 'partial' ? 'partial' : 'no';
    input.actionOutcome.treatmentContext = String(outcomeEv.context?.treatment || '');
  }

  return input;
}
