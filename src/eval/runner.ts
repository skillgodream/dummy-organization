import { EVAL_SCENARIOS } from './scenarios.js';
import { deanEvaluator } from './evaluator.js';
import { EvaluationSuiteReport, EvaluationResult, ScenarioDefinition } from './evalTypes.js';

export class EvaluationRunner {
  private lastReport: EvaluationSuiteReport | null = null;

  public getScenarios(): ScenarioDefinition[] {
    return EVAL_SCENARIOS;
  }

  public getScenarioById(id: string): ScenarioDefinition | undefined {
    return EVAL_SCENARIOS.find(s => s.id === id);
  }

  public async runScenario(id: string): Promise<EvaluationResult> {
    const scenario = this.getScenarioById(id);
    if (!scenario) {
      throw new Error(`Scenario not found: ${id}`);
    }
    return await deanEvaluator.evaluateScenario(scenario);
  }

  public async runAll(): Promise<EvaluationSuiteReport> {
    const report = await deanEvaluator.evaluateSuite(EVAL_SCENARIOS);
    this.lastReport = report;
    return report;
  }

  public getLastReport(): EvaluationSuiteReport | null {
    return this.lastReport;
  }
}

export const evaluationRunner = new EvaluationRunner();
