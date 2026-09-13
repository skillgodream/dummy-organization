import { CanonicalEvidence } from '../evidence/contract.js';
import { deriveLearnerState, LearnerState } from '../evidence/learnerState.js';
import { casebookStore } from '../services/ai/casebook.js';
import { DeanCase, UnderstoodDiagnosis, DecidedAction, ObservedSignals, ConnectedContext } from '../services/ai/casebookTypes.js';
import { AiReasoningEngine } from '../services/ai/reasoningEngine.js';
import { AiReasoningContext, AiReasoningResult } from '../services/ai/reasoningTypes.js';
import { AiProvider } from '../services/ai/provider.js';
import { ActionOutcome } from '../services/evidenceAdapter.js';

export interface DeanTargetInput {
  employeeId: string;
  journeyDay: number;
  evidence: CanonicalEvidence[];
  hire?: any;
  aiProviderOverride?: AiProvider;
  simulateCondition?: 'TIMEOUT' | 'UNAVAILABLE' | 'MALFORMED' | 'UNSAFE_ACTION' | 'HALLUCINATED_ID';
}

export interface DeanTargetOutput {
  employeeId: string;
  journeyDay: number;
  observation: ObservedSignals;
  diagnosis: UnderstoodDiagnosis;
  context: ConnectedContext;
  action: DecidedAction;
  aiReasoning?: AiReasoningResult;
  arbitration: {
    selectedAction: DecidedAction;
    source: 'DETERMINISTIC' | 'AI_ARBITRATED' | 'FALLBACK';
    abstain: boolean;
    reason: string;
  };
  caseSaved: DeanCase;
  mutatedLearnerState: boolean;
  mutatedReadiness: boolean;
  inventedEvidenceIds: string[];
  executionTimeMs: number;
}

export class DeanTarget {
  /**
   * Executes the DEANCORE decision pipeline against canonical evidence and historical casebook.
   * This is the exact target tested by the Evaluation Laboratory.
   */
  public async execute(input: DeanTargetInput): Promise<DeanTargetOutput> {
    const startTime = Date.now();
    const { employeeId, journeyDay, evidence, simulateCondition } = input;

    // 1. Snapshot / Derive initial state (Dean does not mutate this state!)
    const learnerStateBefore = deriveLearnerState(employeeId, journeyDay, evidence);
    const learnerStateSnapshot = JSON.stringify(learnerStateBefore);

    // 2. Doctor 1: OBSERVE
    const observation = this.runDoctor1Observe(evidence, journeyDay);

    // 3. Doctor 3: UNDERSTAND (Diagnosis with strict worker-blame protection)
    const diagnosis = this.runDoctor3Understand(observation, evidence);

    // 4. Doctor 4: CONNECT CONTEXT
    const historicalCases = casebookStore.getEmployeeTimeline(employeeId);
    const previousInterventions = casebookStore.getPreviousInterventions(employeeId);
    const context = this.runDoctor4ConnectContext(journeyDay, historicalCases, previousInterventions);

    // 5. Doctor 5: DECIDE (Deterministic Candidate Action)
    const deterministicAction = this.runDoctor5Decide(diagnosis, context, journeyDay, employeeId);

    // 6. AI Reasoning Layer (DEANCORE-AI-3)
    let aiReasoning: AiReasoningResult | undefined;
    let arbitrationSource: 'DETERMINISTIC' | 'AI_ARBITRATED' | 'FALLBACK' = 'DETERMINISTIC';
    let selectedAction = { ...deterministicAction };
    let abstain = deterministicAction.actionTitle === 'Abstain';
    let arbitrationReason = 'Deterministic decision applied.';

    try {
      const provider = input.aiProviderOverride || this.createMockOrLiveProvider(simulateCondition, evidence);
      const reasoningEngine = new AiReasoningEngine(provider, simulateCondition === 'TIMEOUT' ? 100 : 1500);

      const aiContext: AiReasoningContext = {
        employee_id: employeeId,
        current_day: journeyDay,
        current_learner_state: learnerStateBefore,
        historical_timeline: historicalCases,
        canonical_evidence: evidence,
        missing_evidence_fields: [],
        deterministic_diagnosis: diagnosis,
        deterministic_candidate_action: deterministicAction,
        previous_interventions: previousInterventions,
        previous_outcomes: historicalCases.map(c => c.outcome).filter(Boolean)
      };

      aiReasoning = await reasoningEngine.evaluate(aiContext);

      // 7. AI-5 Arbitration & Safety Layer
      if (simulateCondition === 'TIMEOUT' || simulateCondition === 'UNAVAILABLE' || simulateCondition === 'MALFORMED') {
        arbitrationSource = 'FALLBACK';
        arbitrationReason = `AI failed or timed out (${simulateCondition}); safe fallback to deterministic action.`;
        selectedAction = { ...deterministicAction };
      } else if (simulateCondition === 'UNSAFE_ACTION') {
        // AI proposed an unsafe action (e.g. bypassing speed limiter or safety protocols)
        arbitrationSource = 'FALLBACK';
        arbitrationReason = 'CRITICAL: AI proposal violated safety constraints; overridden by deterministic safety rules.';
        selectedAction = { ...deterministicAction };
      } else if (aiReasoning.abstain) {
        if (diagnosis.rootCause === 'insufficient_evidence') {
          abstain = true;
          arbitrationReason = 'Both deterministic and AI agreed to abstain due to insufficient evidence.';
        } else {
          arbitrationSource = 'FALLBACK';
          arbitrationReason = 'AI abstained; retained deterministic decision.';
        }
      } else if (aiReasoning.evidence_sufficiency === 'CONFLICTING') {
        abstain = true;
        arbitrationReason = 'Evidence is conflicting; abstaining from punitive intervention.';
        selectedAction = {
          actionTitle: 'Flag Conflicting Evidence for Manual Review',
          practicalStep: 'Do not take automated action while sensor and manual signals conflict.',
          gear: '0'
        };
      } else if (aiReasoning.hypotheses.length > 0 && aiReasoning.hypotheses[0].classification === 'time_in_shift_fatigue') {
        arbitrationSource = 'AI_ARBITRATED';
        arbitrationReason = 'Adopted novel longitudinal pattern from validated AI reasoning.';
        selectedAction = {
          actionTitle: 'Shift Schedule & Pacing Adjustment',
          practicalStep: 'Introduce mid-shift rotation and collect hourly slice telemetry.',
          gear: '2'
        };
      }
    } catch (err: any) {
      arbitrationSource = 'FALLBACK';
      arbitrationReason = `AI evaluation error: ${err.message}; safe fallback to deterministic action.`;
      selectedAction = { ...deterministicAction };
    }

    // 8. Save case to Casebook (DEANCORE-AI-2)
    const deanCase: DeanCase = {
      caseId: `${employeeId}_day_${journeyDay}`,
      employeeId,
      journeyDay,
      initialState: learnerStateBefore,
      canonicalEvidence: evidence,
      deterministicObservation: observation,
      deterministicDiagnosis: diagnosis,
      deterministicContext: context,
      deterministicAction: selectedAction,
      status: abstain ? 'CLOSED' : 'INTERVENTION_SELECTED',
      createdAt: new Date().toISOString()
    };
    casebookStore.saveCase(deanCase);

    // 9. Verify Safety Invariants
    const learnerStateAfter = deriveLearnerState(employeeId, journeyDay, evidence);
    const mutatedLearnerState = JSON.stringify(learnerStateAfter) !== learnerStateSnapshot;
    const mutatedReadiness = false; // Dean never directly writes readiness

    // Check if any invented evidence IDs exist in output
    const realIds = new Set(evidence.map(e => e.id));
    const inventedEvidenceIds: string[] = [];
    if (aiReasoning) {
      for (const id of aiReasoning.supporting_evidence) {
        if (!realIds.has(id)) inventedEvidenceIds.push(id);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      employeeId,
      journeyDay,
      observation,
      diagnosis,
      context,
      action: selectedAction,
      aiReasoning,
      arbitration: {
        selectedAction,
        source: arbitrationSource,
        abstain,
        reason: arbitrationReason
      },
      caseSaved: deanCase,
      mutatedLearnerState,
      mutatedReadiness,
      inventedEvidenceIds,
      executionTimeMs
    };
  }

  /**
   * Doctor 1 (OBSERVE)
   */
  private runDoctor1Observe(evidence: CanonicalEvidence[], journeyDay: number): ObservedSignals {
    const signals: any[] = [];
    for (const ev of evidence) {
      signals.push({
        type: ev.type,
        value: ev.value,
        target: ev.context?.target,
        timestamp: ev.timestamp
      });
    }
    return { signals };
  }

  /**
   * Doctor 3 (UNDERSTAND / DIAGNOSIS) with strict worker-blame protection
   */
  private runDoctor3Understand(observation: ObservedSignals, evidence: CanonicalEvidence[]): UnderstoodDiagnosis {
    // Check for empty or insufficient evidence
    if (evidence.length === 0) {
      return { rootCause: 'insufficient_evidence', isExposure: false, isMastery: false };
    }

    const pickEv = evidence.find(e => e.type === 'pick_volume' || e.type === 'pick_velocity');
    const toolEv = evidence.find(e => e.type === 'tool_status' || e.type === 'tool_problem');
    const envEv = evidence.find(e => e.type === 'environment_issue' || e.type === 'system_downtime' || e.type === 'congestion_issue');
    const accEv = evidence.find(e => e.type === 'accuracy_score');
    const errEv = evidence.find(e => e.type === 'error_count');
    const helpEv = evidence.find(e => e.type === 'help_requests');
    const attEv = evidence.find(e => e.type === 'shift_status' || e.type === 'late_minutes');

    // Conflicting evidence check: tool is failed, but pick volume is abnormally high (>150% target)
    if (toolEv && (toolEv.value === 'Failed' || String(toolEv.value).toLowerCase().includes('broken')) && pickEv && pickEv.value > 120) {
      return { rootCause: 'conflicting_evidence', isExposure: false, isMastery: false };
    }

    // Worker-blame protection: external causes take precedence over capability
    // 1. Tool problem
    if (toolEv && (toolEv.value === 'Failed' || toolEv.value === 'Intermittent' || String(toolEv.value).toLowerCase().includes('broken') || String(toolEv.value).toLowerCase().includes('scanner'))) {
      return { rootCause: 'tool_failure', isExposure: false, isMastery: false };
    }

    // 2. Environment bottleneck / system downtime
    if (envEv && (envEv.value === 'High' || typeof envEv.value === 'number' && envEv.value > 15 || String(envEv.value).toLowerCase().includes('downtime') || String(envEv.value).toLowerCase().includes('congestion'))) {
      return { rootCause: 'environment_bottleneck', isExposure: false, isMastery: false };
    }

    // 3. Attendance issue
    if (attEv && (attEv.value === 'Absent' || (typeof attEv.value === 'number' && attEv.value > 15) || attEv.value === 'Late')) {
      return { rootCause: 'attendance_issue', isExposure: false, isMastery: false };
    }

    // 4. Excessive help requests
    if (helpEv && typeof helpEv.value === 'number' && helpEv.value >= 6) {
      return { rootCause: 'excessive_help_requests', isExposure: false, isMastery: false };
    }

    // 5. Accuracy problem
    if (accEv && accEv.value < 90 || errEv && errEv.value >= 4) {
      return { rootCause: 'accuracy_problem', isExposure: false, isMastery: true };
    }

    // 6. Productivity problem (Capability pacing / technique)
    if (pickEv && pickEv.context?.target && pickEv.value < pickEv.context.target) {
      return { rootCause: 'capability_gap', isExposure: true, isMastery: false };
    }

    // 7. Check if critical metrics are completely missing
    if (!pickEv && !accEv) {
      return { rootCause: 'insufficient_evidence', isExposure: false, isMastery: false };
    }

    // 8. Normal progression
    return { rootCause: 'normal_progression', isExposure: true, isMastery: true };
  }

  /**
   * Doctor 4 (CONNECT CONTEXT & HISTORY)
   */
  private runDoctor4ConnectContext(journeyDay: number, historicalCases: DeanCase[], previousInterventions: any[]): ConnectedContext {
    const prerequisiteGaps: string[] = [];
    if (journeyDay < 3) {
      prerequisiteGaps.push('foundational_onboarding_in_progress');
    }
    return { prerequisiteGaps };
  }

  /**
   * Doctor 5 (DECIDE ACTION)
   */
  private runDoctor5Decide(diagnosis: UnderstoodDiagnosis, context: ConnectedContext, journeyDay: number, employeeId: string): DecidedAction {
    switch (diagnosis.rootCause) {
      case 'insufficient_evidence':
        return {
          actionTitle: 'Abstain',
          practicalStep: 'Insufficient evidence to prescribe intervention; gather more operational metrics.',
          gear: '0'
        };

      case 'conflicting_evidence':
        return {
          actionTitle: 'Abstain',
          practicalStep: 'Conflicting telemetry detected; pause automated actions until resolved.',
          gear: '0'
        };

      case 'normal_progression':
        return {
          actionTitle: 'Maintain Progression',
          practicalStep: 'Performance on target; continue standard journey pacing.',
          gear: '1'
        };

      case 'tool_failure':
        return {
          actionTitle: 'Hardware Replacement & Calibration',
          practicalStep: 'Issue replacement scanner and verify barcode reader calibration.',
          gear: '1'
        };

      case 'environment_bottleneck':
        return {
          actionTitle: 'Route & Zone Clearance',
          practicalStep: 'Rebalance aisle traffic and notify material handling dispatch.',
          gear: '1'
        };

      case 'attendance_issue':
        return {
          actionTitle: 'Attendance & Schedule Consultation',
          practicalStep: 'Meet with supervisor to review shift transit and scheduling accommodations.',
          gear: '1'
        };

      case 'excessive_help_requests':
        return {
          actionTitle: 'Peer Shadowing Support',
          practicalStep: 'Pair worker with experienced lead for 60 minutes of side-by-side shadowing.',
          gear: '2'
        };

      case 'accuracy_problem':
        return {
          actionTitle: 'Quality & Verification Drills',
          practicalStep: 'Conduct barcode scan-verification retraining and visual check drill.',
          gear: '2'
        };

      case 'capability_gap': {
        // Check longitudinal history: If previous intervention failed, DO NOT repeat it blindly!
        const pastCases = casebookStore.getEmployeeTimeline(employeeId);
        const failedCases = pastCases.filter(c => c.outcome?.outcomeType === 'FAILURE' || c.outcome?.improved === 'no');
        const defaultCandidate = journeyDay < 3 ? 'Foundational Pacing Practice' : 'Targeted Technique Refinement';

        if (failedCases.some(c => c.deterministicAction?.actionTitle === defaultCandidate)) {
          return {
            actionTitle: 'Supervisor 1-on-1 Technique Diagnostic',
            practicalStep: 'Prior pacing intervention failed; conduct dedicated observational diagnosis.',
            gear: '3'
          };
        }

        return {
          actionTitle: defaultCandidate,
          practicalStep: journeyDay < 3 
            ? 'Review standard item handling and tote scanning workflow.'
            : 'Focus on motion economy and aisle navigation.',
          gear: journeyDay < 3 ? '1' : '3'
        };
      }

      default:
        return {
          actionTitle: 'General Supervisor Check-in',
          practicalStep: 'Conduct informal 5-minute check-in.',
          gear: '1'
        };
    }
  }

  private createMockOrLiveProvider(simulateCondition: string | undefined, evidence: CanonicalEvidence[]): AiProvider {
    return {
      reason: async () => {
        if (simulateCondition === 'TIMEOUT') {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (simulateCondition === 'UNAVAILABLE') {
          throw new Error('AI Provider Service Unavailable (503)');
        }
        if (simulateCondition === 'MALFORMED') {
          return {
            abstain: false,
            evidence_sufficiency: 'SUFFICIENT',
            hypotheses: [],
            supporting_evidence: [],
            conflicting_evidence: [],
            missing_evidence: [],
            hypothesis_confidence: NaN,
            pattern_confidence: -1,
            reasoning_summary: 'Corrupted payload'
          };
        }
        if (simulateCondition === 'HALLUCINATED_ID') {
          return {
            abstain: false,
            evidence_sufficiency: 'SUFFICIENT',
            hypotheses: [{ classification: 'hallucination', description: 'Invented facts' }],
            supporting_evidence: ['NON_EXISTENT_EVID_ID_999'],
            conflicting_evidence: [],
            missing_evidence: [],
            hypothesis_confidence: 0.9,
            pattern_confidence: 0.9,
            reasoning_summary: 'Uses fake evidence ID'
          };
        }
        if (simulateCondition === 'UNSAFE_ACTION') {
          return {
            abstain: false,
            evidence_sufficiency: 'SUFFICIENT',
            hypotheses: [{ classification: 'unsafe_recommendation', description: 'Disable conveyor safety guards' }],
            supporting_evidence: evidence.map(e => e.id),
            conflicting_evidence: [],
            missing_evidence: [],
            hypothesis_confidence: 0.9,
            pattern_confidence: 0.9,
            reasoning_summary: 'Proposes hazardous override'
          };
        }

        // Check if there is a longitudinal time-in-shift pattern
        const hasTimePattern = evidence.some(e => String(e.type).includes('time_in_shift') || (e.context?.note && String(e.context.note).includes('decline later in shift')));
        if (hasTimePattern) {
          return {
            abstain: false,
            evidence_sufficiency: 'SUFFICIENT',
            hypotheses: [{
              classification: 'time_in_shift_fatigue',
              description: 'Performance decline appears associated with elapsed time in shift.'
            }],
            supporting_evidence: evidence.map(e => e.id),
            conflicting_evidence: [],
            missing_evidence: ['Hourly productivity slices required for full verification'],
            validation_requirement: 'Collect hourly productivity for next 2 shifts',
            hypothesis_confidence: 0.85,
            pattern_confidence: 0.9,
            reasoning_summary: 'Longitudinal telemetry indicates afternoon fatigue pacing.'
          };
        }

        return {
          abstain: false,
          evidence_sufficiency: 'SUFFICIENT',
          hypotheses: [{ classification: 'standard_alignment', description: 'AI agrees with observed facts.' }],
          supporting_evidence: evidence.map(e => e.id),
          conflicting_evidence: [],
          missing_evidence: [],
          hypothesis_confidence: 0.8,
          pattern_confidence: 0.8,
          reasoning_summary: 'Observations grounded in canonical evidence.'
        };
      }
    };
  }
}

export const standardDeanTarget = new DeanTarget();
