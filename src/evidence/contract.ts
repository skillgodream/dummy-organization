export type EvidenceCategory = 'attendance' | 'productivity' | 'quality' | 'environment' | 'support' | 'learning';
export type EvidenceKind = 'observed' | 'derived' | 'reported';

export interface CanonicalEvidence {
  id?: string;
  evidence_id?: string;
  subject_id: string;
  subject_type: 'employee' | 'shift' | 'system' | 'location';
  category?: EvidenceCategory;
  type: string;
  timestamp?: string; // ISO datetime
  value: any;
  unit?: string;
  source_system?: string;
  confidence_score?: number;
  evidence_kind?: EvidenceKind;
  context?: Record<string, any>;
  derivation_metadata?: {
    source_events: string[];
    logic: string;
  };
}
