export const LAB_TARGETS = {
  actualUnits: { target: 60, unit: 'items/hour', operator: '>=' },
  errorCount: { target: 2, unit: 'errors', operator: '<=' },
  accuracyPercentage: { target: 98, unit: '%', operator: '>=' },
  timeTakenMinutes: { target: 60, unit: 'minutes', operator: '<=' }, // Example task batch time
  assessmentScore: { target: 80, unit: '%', operator: '>=' },
  helpRequests: { target: 2, unit: 'requests', operator: '<=' },
  downtimeMinutes: { target: 10, unit: 'minutes', operator: '<=' },
};
