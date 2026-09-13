import { DeanCase, CaseStatus } from './casebookTypes.js';

class CasebookStore {
  private inMemoryCases: Record<string, DeanCase> = {};
  private readonly STORAGE_KEY = 'deancore_casebook';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = window.localStorage.getItem(this.STORAGE_KEY);
        if (data) {
          this.inMemoryCases = JSON.parse(data);
        }
      } catch (e) {
        console.warn('Failed to load casebook from localStorage', e);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inMemoryCases));
      } catch (e) {
        console.warn('Failed to save casebook to localStorage', e);
      }
    }
  }

  /**
   * Generates the unique logical ID for a case.
   */
  private getCaseId(employeeId: string, journeyDay: number): string {
    return `${employeeId}_day_${journeyDay}`;
  }

  /**
   * Save a case. 
   * IMMUTABILITY / VERSIONING POLICY:
   * We upsert (merge) to the same case ID to avoid duplicates for the same day.
   * If the case already exists, we overwrite its fields, ensuring the latest 
   * reality of that journey day is captured without creating overlapping cases.
   */
  public saveCase(deanCase: DeanCase): void {
    const id = this.getCaseId(deanCase.employeeId, deanCase.journeyDay);
    deanCase.caseId = id; // Ensure consistency
    
    // Upsert versioning policy: The newest save for a given employee+day becomes the truth.
    this.inMemoryCases[id] = { ...deanCase };
    this.saveToStorage();
  }

  public getCase(employeeId: string, journeyDay: number): DeanCase | undefined {
    const id = this.getCaseId(employeeId, journeyDay);
    return this.inMemoryCases[id];
  }

  /**
   * Returns cases in chronological order of journeyDay.
   */
  public getEmployeeTimeline(employeeId: string): DeanCase[] {
    return Object.values(this.inMemoryCases)
      .filter(c => c.employeeId === employeeId)
      .sort((a, b) => a.journeyDay - b.journeyDay);
  }

  public getPreviousCases(employeeId: string, currentJourneyDay: number): DeanCase[] {
    return this.getEmployeeTimeline(employeeId)
      .filter(c => c.journeyDay < currentJourneyDay);
  }

  /**
   * Retrieves previous interventions given to this employee.
   */
  public getPreviousInterventions(employeeId: string): any[] {
    return this.getEmployeeTimeline(employeeId)
      .map(c => c.deterministicAction || c.intervention)
      .filter(Boolean);
  }

  public getCasesByOutcome(employeeId: string): DeanCase[] {
    return this.getEmployeeTimeline(employeeId)
      .filter(c => c.outcome !== undefined);
  }

  public getOpenCases(employeeId: string): DeanCase[] {
    return this.getEmployeeTimeline(employeeId)
      .filter(c => c.status !== 'CLOSED');
  }
  
  public getCaseById(caseId: string): DeanCase | undefined {
    return this.inMemoryCases[caseId];
  }

  public recordOutcome(caseId: string, outcome: any): void {
    if (this.inMemoryCases[caseId]) {
      this.inMemoryCases[caseId].outcome = outcome;
      this.inMemoryCases[caseId].status = 'CLOSED';
      this.saveToStorage();
    }
  }

  public clear() {
    this.clearAll();
  }

  public clearAll() {
    this.inMemoryCases = {};
    this.saveToStorage();
  }
}

export const casebookStore = new CasebookStore();
