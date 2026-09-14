import { doc, setDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { CanonicalEvidence } from '../evidence/contract.js';

export const SIMULATOR_EVIDENCE_COLLECTION = 'simulator_evidence';

/**
 * Broadcasts a single evidence record to Firestore simulator_evidence collection
 */
export async function broadcastShiftToCloud(evidenceRecord: CanonicalEvidence): Promise<void> {
  try {
    const docId = evidenceRecord.evidence_id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const docRef = doc(db, SIMULATOR_EVIDENCE_COLLECTION, docId);
    await setDoc(docRef, {
      ...evidenceRecord,
      id: docId,
      _syncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firestore Sync] Failed to broadcast evidence record:', err);
  }
}

/**
 * Synchronizes a list of canonical evidence items to Firestore in batches
 */
export async function broadcastAllEvidenceToCloud(evidenceList: CanonicalEvidence[]): Promise<number> {
  try {
    const BATCH_SIZE = 450;
    let count = 0;

    for (let i = 0; i < evidenceList.length; i += BATCH_SIZE) {
      const chunk = evidenceList.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const docId = item.evidence_id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const docRef = doc(db, SIMULATOR_EVIDENCE_COLLECTION, docId);
        batch.set(docRef, {
          ...item,
          id: docId,
          _syncedAt: new Date().toISOString()
        });
        count++;
      }

      await batch.commit();
    }
    return count;
  } catch (err) {
    console.warn('[Firestore Sync] Batch broadcast error:', err);
    return 0;
  }
}
