import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, RefreshCw, Database, Server } from 'lucide-react';

export function Home() {
  const [copied, setCopied] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic public URL
  const origin = window.location.origin;
  const evidenceUrl = `${origin}/api/v1/evidence`;

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evidence');
      const data = await res.json();
      setRecordCount(Array.isArray(data) ? data.length : 0);
    } catch (e) {
      console.error('Failed to fetch evidence status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(evidenceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2 py-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">SkillGo Club</h1>
        <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">
          Central Organization Simulator & Longitudinal Evidence Provider for AI Agent Evaluation.
        </p>
      </div>

      {/* Live Cloud Firestore Connection Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Google Cloud Firestore (Continuous Sync)</h2>
              <p className="text-xs text-slate-500">Real-time WebSocket pipeline pushing shifts to Check-in App in &lt;200ms</p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh record count"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Target Collection:</span>
            <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">simulator_evidence</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Database ID:</span>
            <span className="font-mono text-slate-700">ai-studio-organizationsimu-69feac0c-7d69-45d3-93fa-c069f1001ea5</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Continuous Mode:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Broadcasting on Shift / Lab update
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time Stream: <strong>Active & Syncing</strong></span>
          </div>
          <div className="text-slate-500">
            Total Synced Records: <strong className="text-slate-900">{recordCount !== null ? recordCount : '...'}</strong>
          </div>
        </div>
      </div>

      {/* HTTP REST Fallback Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">HTTP REST Evidence Endpoint (Fallback)</h2>
              <p className="text-xs text-slate-500">CORS-enabled REST boundary for external API clients and crawlers</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <code className="text-xs font-mono text-slate-800 break-all select-all py-1">
            {evidenceUrl}
          </code>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all active:scale-95 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy URL'}</span>
            </button>
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Open raw JSON"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-900 space-y-2">
        <h3 className="font-semibold text-sm text-amber-950 flex items-center gap-1.5">
          <span>⚠️ Important for Check-in App Configuration</span>
        </h3>
        <p className="leading-relaxed">
          Your Check-in App was previously configured to query the old demo endpoint (<code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono text-amber-950">dummy-organization.vercel.app</code>).
        </p>
        <p className="leading-relaxed">
          To immediately receive the updated Day 4 numbers (and any new shift records you edit in Dean Lab), paste the copied URL into your check-in app's configuration or agent prompt!
        </p>
      </div>
    </div>
  );
}
