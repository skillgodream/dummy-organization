import { orgService } from './services.js';

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

export const scenarios = {
  runScenarioA: (employeeId: string, supervisorId: string) => {
    // SCENARIO A — SKILL PROBLEM
    // normal environment, repeated task errors, productivity decline, supervisor correction
    const baseTime = new Date();
    const shift = orgService.startShift(employeeId, baseTime.toISOString());
    
    // Pick 1: Normal
    orgService.logPickBatch(shift.id, 50, 1200, 0, 'Normal', 'Zone A', addMinutes(baseTime, 20));
    
    // Pick 2: Errors start, slower
    orgService.logPickBatch(shift.id, 40, 1500, 2, 'Normal', 'Zone A', addMinutes(baseTime, 45));
    
    // Pick 3: More errors, even slower
    orgService.logPickBatch(shift.id, 30, 1800, 3, 'Normal', 'Zone A', addMinutes(baseTime, 75));
    
    // Supervisor correction
    orgService.addObservation(supervisorId, employeeId, 'SkillIssue', addMinutes(baseTime, 80));
    
    // Skill assessment failed
    orgService.failSkillAssessment(employeeId, 'PickAccuracy', addMinutes(baseTime, 85));
    
    orgService.completeShift(shift.id, addMinutes(baseTime, 120));
  },

  runScenarioB: (employeeId: string) => {
    // SCENARIO B — TOOL PROBLEM
    // employee normally performs well, scanner/device issue occurs, productivity declines, recovers
    const baseTime = new Date();
    const shift = orgService.startShift(employeeId, baseTime.toISOString());
    
    // Pick 1: Good performance
    orgService.logPickBatch(shift.id, 60, 1200, 0, 'Normal', 'Zone B', addMinutes(baseTime, 20));
    
    // Scanner problem occurs
    orgService.reportToolProblem(employeeId, 'Scanner #42', addMinutes(baseTime, 25));
    
    // Pick 2: Bad productivity, zero errors
    orgService.logPickBatch(shift.id, 20, 1800, 0, 'Normal', 'Zone B', addMinutes(baseTime, 55));
    
    // Scanner fixed implicitly
    // Pick 3: Recovers
    orgService.logPickBatch(shift.id, 60, 1200, 0, 'Normal', 'Zone B', addMinutes(baseTime, 75));
    
    orgService.completeShift(shift.id, addMinutes(baseTime, 120));
  },

  runScenarioC: (employeeId: string) => {
    // SCENARIO C — NEW TASK
    // employee changes task/zone, productivity temporarily declines, accuracy remains acceptable
    const baseTime = new Date();
    const shift = orgService.startShift(employeeId, baseTime.toISOString());
    
    // Pick 1: Good in Zone A
    orgService.logPickBatch(shift.id, 60, 1200, 0, 'Normal', 'Zone A', addMinutes(baseTime, 20));
    
    // Zone Change
    orgService.changeZone(employeeId, 'Zone C_Heavy', addMinutes(baseTime, 25));
    
    // Pick 2: Low productivity, no errors
    orgService.logPickBatch(shift.id, 30, 1500, 0, 'Normal', 'Zone C_Heavy', addMinutes(baseTime, 50));
    
    // Pick 3: Adapting
    orgService.logPickBatch(shift.id, 45, 1200, 0, 'Normal', 'Zone C_Heavy', addMinutes(baseTime, 70));
    
    orgService.completeShift(shift.id, addMinutes(baseTime, 120));
  },

  runScenarioD: (employeeId: string) => {
    // SCENARIO D — ACCURACY TRADEOFF
    // productivity increases, accuracy decreases
    const baseTime = new Date();
    const shift = orgService.startShift(employeeId, baseTime.toISOString());
    
    // Pick 1: Normal
    orgService.logPickBatch(shift.id, 50, 1200, 0, 'Normal', 'Zone A', addMinutes(baseTime, 20));
    
    // Pick 2: Faster but 1 error
    orgService.logPickBatch(shift.id, 70, 1100, 1, 'Normal', 'Zone A', addMinutes(baseTime, 40));
    
    // Pick 3: Even faster, 4 errors
    orgService.logPickBatch(shift.id, 90, 1000, 4, 'Normal', 'Zone A', addMinutes(baseTime, 60));
    
    orgService.completeShift(shift.id, addMinutes(baseTime, 120));
  },

  runScenarioE: (employeeId: string) => {
    // SCENARIO E — INSUFFICIENT EVIDENCE
    // productivity changes, very little supporting evidence
    const baseTime = new Date();
    const shift = orgService.startShift(employeeId, baseTime.toISOString());
    
    // Pick 1: Normal
    orgService.logPickBatch(shift.id, 50, 1200, 0, 'Normal', 'Zone A', addMinutes(baseTime, 20));
    
    // Pick 2: Huge unexplained drop
    orgService.logPickBatch(shift.id, 10, 1800, 0, 'Normal', 'Zone A', addMinutes(baseTime, 50));
    
    orgService.completeShift(shift.id, addMinutes(baseTime, 120));
  }
};
