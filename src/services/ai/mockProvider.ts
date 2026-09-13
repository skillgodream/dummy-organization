import { AiProvider } from './provider.js';
import { AiReasoningContext, AiReasoningResult } from './reasoningTypes.js';

/**
 * A deterministic mock provider for DEANCORE-AI-3 tests.
 * We use specific triggers in the employee_id or manager notes to simulate behavior.
 */
export class MockAiProvider implements AiProvider {
  public async reason(context: AiReasoningContext): Promise<AiReasoningResult> {
    
    // Check for prompt injection simulation
    // Using string serialization for simplicity in mock
    const contextStr = JSON.stringify(context);
    if (contextStr.includes('Ignore previous instructions')) {
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [{
          classification: 'injection_attempt_detected',
          description: 'Supervisor note contained prompt injection text.',
        }],
        supporting_evidence: [],
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0.9,
        pattern_confidence: 0.9,
        reasoning_summary: 'Treated prompt injection as untrusted data.'
      };
    }

    if (context.employee_id === 'EMP-SUPPORTED') {
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [{ classification: 'skill_problem_confirmed', description: 'Deterministic diagnosis matches evidence.' }],
        supporting_evidence: context.canonical_evidence.map(e => e.id),
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0.85,
        pattern_confidence: 0.8,
        reasoning_summary: 'AI agrees with generic diagnosis based on solid evidence.'
      };
    }

    if (context.employee_id === 'EMP-NOVEL') {
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [{ classification: 'time_in_shift_fatigue', description: 'Performance decline is linked to time in shift.' }],
        supporting_evidence: context.canonical_evidence.map(e => e.id),
        conflicting_evidence: [],
        missing_evidence: [],
        validation_requirement: 'Collect hourly productivity data',
        hypothesis_confidence: 0.9,
        pattern_confidence: 0.95,
        reasoning_summary: 'Identified a longitudinal time-linked pattern.'
      };
    }

    if (context.employee_id === 'EMP-INSUFFICIENT') {
      return {
        abstain: true,
        evidence_sufficiency: 'INSUFFICIENT',
        hypotheses: [],
        supporting_evidence: [],
        conflicting_evidence: [],
        missing_evidence: ['Missing hardware status', 'Missing accuracy data'],
        hypothesis_confidence: 0.1,
        pattern_confidence: 0.1,
        reasoning_summary: 'Not enough data to hypothesize.'
      };
    }

    if (context.employee_id === 'EMP-CONFLICT') {
      return {
        abstain: false,
        evidence_sufficiency: 'CONFLICTING',
        hypotheses: [{ classification: 'ambiguous_state', description: 'Tool failed but productivity is high.' }],
        supporting_evidence: [],
        conflicting_evidence: context.canonical_evidence.map(e => e.id),
        missing_evidence: [],
        hypothesis_confidence: 0.3,
        pattern_confidence: 0.2,
        reasoning_summary: 'Evidence contradicts itself.'
      };
    }

    if (context.employee_id === 'EMP-HALLUCINATE-ID') {
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [{ classification: 'fake', description: 'fake' }],
        supporting_evidence: ['FAKE-ID-999'], // This will be caught by validator
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0.9,
        pattern_confidence: 0.9,
        reasoning_summary: 'Hallucination'
      };
    }

    if (context.employee_id === 'EMP-RECURRENCE') {
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [{ classification: 'recurrent_issue', description: 'Same symptom recurs despite past intervention.' }],
        supporting_evidence: context.canonical_evidence.map(e => e.id),
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0.9,
        pattern_confidence: 0.9,
        reasoning_summary: 'Pattern recognized across timeline.'
      };
    }

    if (context.employee_id === 'EMP-COMPETING') {
      return {
        abstain: false,
        evidence_sufficiency: 'PARTIALLY_SUPPORTED',
        hypotheses: [
          { classification: 'capability_pacing', description: 'Learner is slowing down.' },
          { classification: 'equipment_limitation', description: 'Scanner might be failing silently.' }
        ],
        supporting_evidence: context.canonical_evidence.map(e => e.id),
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0.5,
        pattern_confidence: 0.5,
        reasoning_summary: 'Multiple plausible explanations remain.'
      };
    }

    if (context.employee_id === 'EMP-TIMEOUT') {
      // Simulate slow response that triggers timeout
      await new Promise(resolve => setTimeout(resolve, 10000));
      return {
        abstain: false,
        evidence_sufficiency: 'SUFFICIENT',
        hypotheses: [],
        supporting_evidence: [],
        conflicting_evidence: [],
        missing_evidence: [],
        hypothesis_confidence: 0,
        pattern_confidence: 0,
        reasoning_summary: 'Should have timed out.'
      };
    }

    // Default fallback
    return {
      abstain: true,
      evidence_sufficiency: 'INSUFFICIENT',
      hypotheses: [],
      supporting_evidence: [],
      conflicting_evidence: [],
      missing_evidence: [],
      hypothesis_confidence: 0,
      pattern_confidence: 0,
      reasoning_summary: 'Default abstention.'
    };
  }
}
