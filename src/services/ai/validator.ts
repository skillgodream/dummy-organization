import { AiReasoningContext, AiReasoningResult } from './reasoningTypes.js';

export function validateAiResult(context: AiReasoningContext, result: AiReasoningResult): AiReasoningResult {
  // If already abstaining, just return it
  if (result.abstain) {
    return result;
  }

  // If evidence is insufficient, it MUST abstain
  if (result.evidence_sufficiency === 'INSUFFICIENT') {
    return createAbstainResult('Model returned INSUFFICIENT but did not set abstain flag.');
  }

  // Validate that supporting_evidence and conflicting_evidence actually exist in the context
  const availableEvidenceIds = new Set<string>();
  
  context.canonical_evidence.forEach(ev => availableEvidenceIds.add(ev.id));
  context.historical_timeline.forEach(caseRecord => {
    caseRecord.canonicalEvidence.forEach(ev => availableEvidenceIds.add(ev.id));
  });

  for (const id of result.supporting_evidence) {
    if (!availableEvidenceIds.has(id)) {
      return createAbstainResult(`Hallucinated supporting evidence ID: ${id}`);
    }
  }

  for (const id of result.conflicting_evidence) {
    if (!availableEvidenceIds.has(id)) {
      return createAbstainResult(`Hallucinated conflicting evidence ID: ${id}`);
    }
  }

  return result;
}

export function createAbstainResult(reason: string): AiReasoningResult {
  return {
    abstain: true,
    evidence_sufficiency: 'INSUFFICIENT',
    hypotheses: [],
    supporting_evidence: [],
    conflicting_evidence: [],
    missing_evidence: [],
    hypothesis_confidence: 0,
    pattern_confidence: 0,
    reasoning_summary: reason
  };
}
