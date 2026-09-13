import { AiReasoningContext, AiReasoningResult } from './reasoningTypes.js';
import { AiProvider } from './provider.js';
import { validateAiResult, createAbstainResult } from './validator.js';

export class AiReasoningEngine {
  constructor(private provider: AiProvider, private timeoutMs: number = 5000) {}

  public async evaluate(context: AiReasoningContext): Promise<AiReasoningResult> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<AiReasoningResult>((_, reject) => {
        setTimeout(() => reject(new Error('AI Provider timeout')), this.timeoutMs);
      });

      // Race provider vs timeout
      const rawResult = await Promise.race([
        this.provider.reason(context),
        timeoutPromise
      ]);

      // Validate result (hallucination protection, sufficiency rules)
      return validateAiResult(context, rawResult);

    } catch (error: any) {
      // Fallback on timeout or failure
      return createAbstainResult(`AI Reasoning failed: ${error.message}`);
    }
  }
}
