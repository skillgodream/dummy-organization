import React, { useState, useEffect } from 'react';

export function EvidenceViewer() {
  const [evidence, setEvidence] = useState<any>(null);

  const fetchEvidence = async () => {
    const res = await fetch('/api/v1/evidence');
    const data = await res.json();
    setEvidence(data);
  };

  useEffect(() => {
    fetchEvidence();
    const interval = setInterval(fetchEvidence, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen border-l border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Integration Boundary</h2>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">GET /api/v1/evidence</span>
      </div>
      
      <p className="text-sm text-slate-600 mb-4">
        This is the normalized canonical evidence output. Internal organization IDs and raw events are isolated from this view.
      </p>

      <div className="bg-[#0f1115] text-slate-300 p-6 rounded-xl font-mono text-xs overflow-auto h-[700px] shadow-sm">
        <pre>{JSON.stringify(evidence, null, 2)}</pre>
      </div>
    </div>
  );
}
