import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OrgStore, orgStore } from '../org/store.js';
import { generatePrefeedRecords } from '../org/prefeedGenerator.js';

describe('Simulator Production Persistence Failure & Recovery Tests', () => {
  beforeEach(async () => {
    orgStore.clearData();
    await orgStore.save();
  });

  it('proves data survival across fresh orgStore/serverless reinitializations (A-K)', async () => {
    // A. Create Priya (EMP-002) Day 0 data
    orgStore.upsertLabRecord({
      employeeId: 'EMP-002',
      journeyDay: 0,
      updatedAt: new Date().toISOString(),
      actualUnits: 50,
      errorCount: 2,
      taskType: 'Picker'
    });
    await orgStore.save();

    // B. Create Priya (EMP-002) Day 4 data
    orgStore.upsertLabRecord({
      employeeId: 'EMP-002',
      journeyDay: 4,
      updatedAt: new Date().toISOString(),
      actualUnits: 80,
      errorCount: 1,
      taskType: 'Picker'
    });
    await orgStore.save();

    // Also add Rahul (EMP-001) data to test employee isolation (K)
    orgStore.upsertLabRecord({
      employeeId: 'EMP-001',
      journeyDay: 1,
      updatedAt: new Date().toISOString(),
      actualUnits: 60,
      taskType: 'Picker'
    });
    await orgStore.save();

    // C. Simulate a fresh orgStore / serverless cold start initialization
    const freshStore1 = new OrgStore();

    // D. Reload the persisted state
    await freshStore1.load();

    // E. Verify Priya Day 0 and Day 4 still exist
    const priyaDay0 = freshStore1.labRecords.find(r => r.employeeId === 'EMP-002' && r.journeyDay === 0);
    const priyaDay4 = freshStore1.labRecords.find(r => r.employeeId === 'EMP-002' && r.journeyDay === 4);
    assert.ok(priyaDay0, 'Priya Day 0 must survive reinitialization');
    assert.ok(priyaDay4, 'Priya Day 4 must survive reinitialization');
    assert.strictEqual(priyaDay0?.actualUnits, 50);
    assert.strictEqual(priyaDay4?.actualUnits, 80);

    // F. Modify Day 4
    freshStore1.upsertLabRecord({
      employeeId: 'EMP-002',
      journeyDay: 4,
      updatedAt: new Date().toISOString(),
      actualUnits: 95,
      errorCount: 0,
      taskType: 'Picker'
    });
    await freshStore1.save();

    // G. Reinitialize again (simulate second serverless cold start)
    const freshStore2 = new OrgStore();
    await freshStore2.load();

    // H. Verify modified Day 4 survives
    const priyaDay4Mod = freshStore2.labRecords.find(r => r.employeeId === 'EMP-002' && r.journeyDay === 4);
    assert.ok(priyaDay4Mod, 'Modified Priya Day 4 must exist');
    assert.strictEqual(priyaDay4Mod?.actualUnits, 95);

    // I. Explicitly reset Priya
    freshStore2.clearLabJourney('EMP-002');
    await freshStore2.save();

    // J. Reinitialize again and verify Priya data is then removed
    const freshStore3 = new OrgStore();
    await freshStore3.load();
    const priyaRecords = freshStore3.labRecords.filter(r => r.employeeId === 'EMP-002');
    assert.strictEqual(priyaRecords.length, 0, 'Priya data must be removed after explicit reset');

    // K. Verify Rahul/Amit/Diana data is unaffected
    const rahulRecords = freshStore3.labRecords.filter(r => r.employeeId === 'EMP-001');
    assert.strictEqual(rahulRecords.length, 1, 'Rahul data must remain unaffected by Priya reset');
    assert.strictEqual(rahulRecords[0].journeyDay, 1);
  });

  it('verifies pre-feed data survives reinitialization', async () => {
    // Generate pre-feed data for Amit (EMP-003)
    const prefeedRecords = generatePrefeedRecords('EMP-003', 5, 'High');
    for (const r of prefeedRecords) {
      orgStore.upsertLabRecord(r);
    }
    await orgStore.save();

    // Reinitialize store
    const freshStore = new OrgStore();
    await freshStore.load();

    const amitRecords = freshStore.labRecords.filter(r => r.employeeId === 'EMP-003');
    assert.strictEqual(amitRecords.length, 5, 'Pre-feed 5 days must survive reinitialization');
  });

  it('verifies Priya (EMP-002) Pre-feed Days 0-4 end-to-end persistence and retrieval', async () => {
    // 1. Generate prefeed records for Priya (EMP-002) for 5 days
    const priyaRecords = generatePrefeedRecords('EMP-002', 5, 'Medium');
    assert.strictEqual(priyaRecords.length, 5);

    for (const r of priyaRecords) {
      orgStore.upsertLabRecord(r);
    }
    await orgStore.save();

    // 2. Cold start / reinitialize store
    const freshStore = new OrgStore();
    await freshStore.load();

    // 3. Verify Days 0, 1, 2, 3, 4 records exist for EMP-002
    const fetchedRecords = freshStore.labRecords.filter(r => r.employeeId === 'EMP-002');
    assert.strictEqual(fetchedRecords.length, 5, 'Priya must have exactly 5 pre-feed records');

    const journeyDays = fetchedRecords.map(r => r.journeyDay).sort((a, b) => a - b);
    assert.deepStrictEqual(journeyDays, [0, 1, 2, 3, 4], 'Priya journey days must be 0, 1, 2, 3, 4');
  });
});
