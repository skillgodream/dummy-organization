import { CanonicalEvidence } from '../evidence/contract.js';
import { DeanCase, UnderstoodDiagnosis, DecidedAction, ObservedSignals } from '../services/ai/casebookTypes.js';
import { AiReasoningResult } from '../services/ai/reasoningTypes.js';

export type EvaluationCategory = 
  | 'PROGRESSION' 
  | 'DIAGNOSIS' 
  | 'SAFETY' 
  | 'LONGITUDINAL' 
  | 'AI_FAILURE' 
  | 'BLAME_PROTECTION' 
  | 'ABSTENTION' 
  | 'OUTCOME_LEARNING';

export interface EvaluationCriteriaScores {
  evidenceGrounding: boolean;
  diagnosisAccuracy: boolean;
  contextUnderstanding: boolean;
  interventionSelection: boolean;
  longitudinalReasoning: boolean;
  safety: boolean;
  abstentionBehavior: boolean;
  workerBlameProtection: boolean;
  evidenceTraceability: boolean;
  outcomeLearning: boolean;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: EvaluationCategory;
  employeeId: string;
  journeyDay: number;
  generateEvidence: () => CanonicalEvidence[];
  multiDaySteps?: Array<{
    day: number;
    evidence: CanonicalEvidence[];
    outcome?: { improved: boolean | 'partial' | 'no'; treatmentContext: string; outcomeType?: 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'INSUFFICIENT_EVIDENCE' | 'UNINTENDED_CONSEQUENCE' };
    expectedDiagnosisRoot?: string;
    expectedActionTitle?: string;
    mustNotRepeatAction?: string;
  }>;
  expected: {
    diagnosisRoot?: string;
    actionTitle?: string;
    abstain?: boolean;
    mustNotBlameWorker?: boolean;
    mustNotRepeatFailedAction?: boolean;
    mustNotMutateLearnerState?: boolean;
    mustNotInventEvidence?: boolean;
    expectedArbitrationSource?: 'DETERMINISTIC' | 'AI_ARBITRATED' | 'FALLBACK';
    novelPatternRequired?: boolean;
    notes?: string;
  };
  simulateCondition?: 'TIMEOUT' | 'UNAVAILABLE' | 'MALFORMED' | 'UNSAFE_ACTION' | 'HALLUCINATED_ID';
}

export interface EvaluationResult {
  scenarioId: string;
  scenarioName: string;
  category: EvaluationCategory;
  evidenceSummary: string[];
  expectedBehavior: string;
  actualBehavior: string;
  status: 'PASS' | 'FAIL';
  failureType?: 'ACCURACY' | 'SAFETY' | 'HALLUCINATION' | 'BLAME' | 'ARBITRATION' | 'LONGITUDINAL' | 'ABSTENTION' | 'TIMEOUT';
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceTrace: string[];
  categoryScores: EvaluationCriteriaScores;
  details: string;
}

export interface EvaluationSuiteReport {
  timestamp: string;
  totalScenarios: number;
  passCount: number;
  failCount: number;
  criticalFailures: number;
  categorySummary: Record<string, { total: number; passed: number; failed: number }>;
  criteriaSummary: Record<keyof EvaluationCriteriaScores, { passed: number; total: number; percentage: number }>;
  results: EvaluationResult[];
  longitudinalResults: {
    totalJourneys: number;
    passedJourneys: number;
    details: string[];
  };
  safetyAudit: {
    totalChecks: number;
    passedChecks: number;
    criticalViolations: string[];
  };
}
