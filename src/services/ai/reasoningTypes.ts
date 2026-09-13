import { CanonicalEvidence } from '../../evidence/contract.js';
import { LearnerState } from '../../evidence/learnerState.js';
import { UnderstoodDiagnosis, DecidedAction, DeanCase } from './casebookTypes.js';

export type EvidenceSufficiency = 'SUFFICIENT' | 'PARTIALLY_SUPPORTED' | 'INSUFFICIENT' | 'CONFLICTING';

export interface NovelCauseHypothesis {
  classification: string;
  description: string;
  differentiation?: string;
}

export interface AiReasoningResult {
  abstain: boolean;
  evidence_sufficiency: EvidenceSufficiency;
  hypotheses: NovelCauseHypothesis[]; // Allow multiple competing hypotheses
  supporting_evidence: string[]; // Array of CanonicalEvidence IDs
  conflicting_evidence: string[]; // Array of CanonicalEvidence IDs
  missing_evidence: string[]; // Descriptions of missing evidence required
  validation_requirement?: string;
  hypothesis_confidence: number;
  pattern_confidence: number;
  reasoning_summary: string;
}

export interface AiReasoningContext {
  employee_id: string;
  current_day: number;
  current_learner_state: LearnerState;
  historical_timeline: DeanCase[];
  canonical_evidence: CanonicalEvidence[];
  missing_evidence_fields: string[];
  deterministic_diagnosis?: UnderstoodDiagnosis;
  deterministic_candidate_action?: DecidedAction;
  previous_interventions: any[];
  previous_outcomes: any[];
}
