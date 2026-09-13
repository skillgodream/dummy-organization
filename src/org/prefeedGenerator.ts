import { LabDayRecord } from './models.js';
import { LAB_TARGETS } from './targets.js';

type Complexity = 'Low' | 'Medium' | 'High' | 'Very High';

export function generatePrefeedRecords(employeeId: string, days: number, complexity: Complexity): LabDayRecord[] {
  const records: LabDayRecord[] = [];

  const baseProductivityTarget = LAB_TARGETS.actualUnits.target; // 60
  const baseErrorTarget = LAB_TARGETS.errorCount.target; // 2
  const baseTimeTarget = LAB_TARGETS.timeTakenMinutes.target; // 60
  
  // Complexity multipliers for standard deviation
  let severityMultiplier = 1;
  switch (complexity) {
    case 'Low': severityMultiplier = 1.1; break; // ~10% deviation
    case 'Medium': severityMultiplier = 1.2; break; // ~20% deviation
    case 'High': severityMultiplier = 1.3; break; // ~30% deviation
    case 'Very High': severityMultiplier = 1.4; break; // ~40% deviation
  }

  for (let day = 0; day < days; day++) {
    // Deterministic pseudo-randomness based on day and employeeId length to make a trajectory
    const dayFactor = (day + 1) / days; // 0 to 1
    const fluctuation = Math.sin(day * Math.PI / 2); // some up and down
    
    // We want the deviation to worsen or vary around the severityMultiplier.
    // e.g. Day 1 is close to target, later days get worse, or vary.
    // Let's create a smooth trajectory: deviation increases with day.
    const currentDeviation = 1 + ((severityMultiplier - 1) * dayFactor * (1 + 0.2 * fluctuation));

    // Calculate actual units (lower is worse)
    const actualUnits = Math.max(0, Math.round(baseProductivityTarget / currentDeviation));
    
    // Calculate errors (higher is worse)
    const errorCount = Math.round(baseErrorTarget * currentDeviation) + (day % 2);
    
    // Calculate accuracy %
    const accuracyPercentage = actualUnits > 0 ? parseFloat(Math.max(0, ((actualUnits - errorCount) / actualUnits) * 100).toFixed(1)) : 0;
    
    // Calculate time taken (higher is worse)
    const timeTakenMinutes = Math.round(baseTimeTarget * (1 + ((currentDeviation - 1) * 0.5)));

    // Categorical variations based on complexity
    let toolStatus = 'Normal';
    let shiftStatus = 'Present';
    let taskProficiency = 'Competent';
    let supervisorAssistance = 'No';
    let workloadCondition = 'Normal';

    if (complexity === 'High' || complexity === 'Very High') {
      if (day % 3 === 0) toolStatus = 'Intermittent';
      if (day % 4 === 0) supervisorAssistance = 'Yes';
      taskProficiency = 'Developing';
      workloadCondition = 'High';
    } else if (complexity === 'Medium') {
      if (day === 2) toolStatus = 'Intermittent';
      taskProficiency = day < 2 ? 'Developing' : 'Competent';
    }

    const record: LabDayRecord = {
      employeeId,
      journeyDay: day, // Days 0 to days-1
      updatedAt: new Date(Date.now() - (days - day) * 86400000).toISOString(), // Past dates
      sourceType: 'lab_prefeed',
      
      // Section A
      taskType: 'Standard Pick',
      expectedUnits: baseProductivityTarget,
      actualUnits,
      timeTakenMinutes,
      shiftStatus,

      // Section B
      errorCount,
      accuracyPercentage,

      // Section C
      attendanceStatus: 'Present',
      lateMinutes: 0,
      shiftCompleted: 'Yes',

      // Section D
      taskProficiency,
      trainingStatus: 'Completed',
      assessmentScore: Math.max(0, Math.round(100 - (10 * (currentDeviation - 1)))),
      newTaskExposure: 'No',

      // Section E
      helpRequests: Math.round(1 * currentDeviation),
      escalationCount: complexity === 'Very High' ? 1 : 0,
      supervisorAssistance,

      // Section F
      toolStatus,
      toolIssue: toolStatus !== 'Normal' ? 'Scanner glitch' : '',
      downtimeMinutes: toolStatus !== 'Normal' ? 15 : 0,

      // Section G
      workloadCondition,
      congestionIssue: '',
      environmentIssue: '',

      // Section H
      supervisorObservation: 'Pre-fed historical evidence',
      behaviorObservation: '',
      communicationObservation: ''
    };

    records.push(record);
  }

  return records;
}
