import { CanonicalEvidence } from '../../evidence/contract.js';
import { LearnerState } from '../../evidence/learnerState.js';
import { ActionOutcome } from '../evidenceAdapter.js';

// Since the Six Doctors' actual interfaces don't exist in the Simulator repo,
// we define minimal representations based on the audit contract to store the historical data.

export interface ObservedSignals {
  // Doctor 1 output
  signals: any[];
}

export interface UnderstoodDiagnosis {
  // Doctor 3 output
  rootCause: string;
  isExposure: boolean;
  isMastery: boolean;
}

export interface ConnectedContext {
  // Doctor 4 output
  prerequisiteGaps: string[];
}

export interface DecidedAction {
  // Doctor 5 output
  actionTitle: string;
  practicalStep: string;
  gear: string;
}

export type CaseStatus = 'OPEN' | 'INTERVENTION_SELECTED' | 'AWAITING_OUTCOME' | 'CLOSED';

export interface DeanCase {
  caseId: string; // Logical ID is usually employeeId_journeyDay, this can just be that combination
  employeeId: string;
  journeyDay: number;
  
  initialState: LearnerState;
  
  // We keep the actual evidence objects to ensure tracing is always possible
  canonicalEvidence: CanonicalEvidence[];
  
  // Deterministic Chain
  deterministicObservation?: ObservedSignals;
  deterministicDiagnosis?: UnderstoodDiagnosis;
  deterministicContext?: ConnectedContext;
  deterministicAction?: DecidedAction;
  
  intervention?: any; // The selected candidate intervention details if distinct from DecidedAction
  
  outcome?: ActionOutcome;
  
  status: CaseStatus;
  createdAt: string;
}
