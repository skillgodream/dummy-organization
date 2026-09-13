import { AiReasoningContext, AiReasoningResult } from './reasoningTypes.js';

export interface AiProvider {
  reason(context: AiReasoningContext): Promise<AiReasoningResult>;
}
