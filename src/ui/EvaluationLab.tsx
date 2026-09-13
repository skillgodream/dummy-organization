import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Cpu, 
  FileText,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EvaluationSuiteReport, EvaluationResult } from '../eval/evalTypes.js';

export function EvaluationLab() {
  const [report, setReport] = useState<EvaluationSuiteReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/internal/eval/report');
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        }
      }
    } catch (err) {
      console.error('Failed to fetch evaluation report', err);
    }
  };

  const handleRunAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/internal/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        }
      }
    } catch (err) {
      console.error('Failed to run evaluations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSingle = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    try {
      const res = await fetch('/api/internal/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result && report) {
          const updatedResults = report.results.map(r => r.scenarioId === scenarioId ? data.result : r);
          const passCount = updatedResults.filter(r => r.status === 'PASS').length;
          const failCount = updatedResults.filter(r => r.status === 'FAIL').length;
          const criticalFailures = updatedResults.filter(r => r.severity === 'CRITICAL').length;
          setReport({
            ...report,
            passCount,
            failCount,
            criticalFailures,
            results: updatedResults
          });
        }
      }
    } catch (err) {
      console.error('Failed to run single scenario', err);
    } finally {
      setRunningScenarioId(null);
    }
  };

  useEffect(() => {
    // Automatically trigger run on load if no report exists
    handleRunAll();
  }, []);

  const filteredResults = report?.results.filter(r => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      r.scenarioName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.scenarioId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.actualBehavior.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <div id="eval-lab-container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">DEANCORE-AI-7</span>
            <span className="text-xs font-medium text-slate-500">Evaluation & Verification Laboratory</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">Dean Intelligence Evaluation Suite</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Controlled laboratory testing of DEANCORE against canonical evidence scenarios, longitudinal journeys, worker-blame protection, and AI failure fallbacks.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="btn-run-all-evals"
            onClick={handleRunAll}
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Evaluating Scenarios...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run All Evaluations ({report?.totalScenarios || 22})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Scenarios</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{report.totalScenarios}</div>
            <div className="text-xs text-slate-500 mt-1">Multi-day & Edge cases</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pass Rate</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {Math.round((report.passCount / report.totalScenarios) * 100)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">{report.passCount} of {report.totalScenarios} passed</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Failures</div>
            <div className={`text-2xl font-bold mt-1 ${report.failCount === 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {report.failCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Diagnostic non-fatal</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Failures</div>
            <div className={`text-2xl font-bold mt-1 ${report.criticalFailures === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {report.criticalFailures}
            </div>
            <div className="text-xs text-slate-500 mt-1">Safety & Blame checks</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Safety Status</div>
            <div className="flex items-center gap-1.5 mt-1">
              {report.criticalFailures === 0 ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-base font-bold text-emerald-600">PASSED</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span className="text-base font-bold text-rose-600">VIOLATION</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">Zero worker blame</div>
          </div>
        </div>
      )}

      {/* Criteria Breakdown Grid */}
      {report && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            10 Canonical Evaluation Criteria Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(report.criteriaSummary).map(([key, rawItem]) => {
              const item = rawItem as { percentage: number; passed: number; total: number };
              const labelMap: Record<string, string> = {
                evidenceGrounding: 'Evidence Grounding',
                diagnosisAccuracy: 'Diagnosis Accuracy',
                contextUnderstanding: 'Context Understanding',
                interventionSelection: 'Intervention Selection',
                longitudinalReasoning: 'Longitudinal Reasoning',
                safety: 'Safety Compliance',
                abstentionBehavior: 'Abstention Behavior',
                workerBlameProtection: 'Worker-Blame Protection',
                evidenceTraceability: 'Evidence Traceability',
                outcomeLearning: 'Outcome Learning'
              };
              return (
                <div key={key} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xs font-medium text-slate-600 truncate">{labelMap[key] || key}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-slate-900">{item.percentage}%</span>
                    <span className="text-xs text-slate-500">{item.passed}/{item.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full ${item.percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-wider pl-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'BLAME_PROTECTION', label: 'Blame Protection' },
            { id: 'LONGITUDINAL', label: 'Longitudinal' },
            { id: 'SAFETY', label: 'Safety & Invariants' },
            { id: 'AI_FAILURE', label: 'AI Fallback' },
            { id: 'DIAGNOSIS', label: 'Diagnosis' },
            { id: 'ABSTENTION', label: 'Abstention' },
            { id: 'OUTCOME_LEARNING', label: 'Outcome Learning' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search scenario or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Scenario Evaluation Cards */}
      <div className="space-y-4">
        {filteredResults.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            No evaluation scenarios match the selected filter.
          </div>
        ) : (
          filteredResults.map(res => {
            const isExpanded = expandedId === res.scenarioId;
            const isRunning = runningScenarioId === res.scenarioId;

            return (
              <div 
                key={res.scenarioId} 
                id={`scenario-card-${res.scenarioId}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {res.status === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-slate-500">{res.scenarioId}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {res.category}
                        </span>
                        {res.severity && (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            res.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {res.severity}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 mt-1">{res.scenarioName}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                      onClick={() => handleRunSingle(res.scenarioId)}
                      disabled={isRunning || loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                      <span>{isRunning ? 'Running...' : 'Re-test'}</span>
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : res.scenarioId)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Trace' : 'Inspect Trace'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Body Summary */}
                <div className="p-5 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">Expected Behavior</span>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-slate-800">
                      {res.expectedBehavior}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">Actual Dean Behavior</span>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-slate-800">
                      {res.actualBehavior}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Evidence Trace */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 space-y-4 bg-white">
                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        Canonical Evidence Grounding ({res.evidenceTrace.length} events)
                      </h5>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                        {res.evidenceSummary.length > 0 ? (
                          res.evidenceSummary.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-700">
                              <span className="text-slate-400">•</span>
                              <span>{ev}</span>
                              <span className="text-slate-400 font-sans text-[10px]">[{res.evidenceTrace[i]}]</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic">No evidence generated (testing abstention behavior)</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Evaluation Criteria Checklist
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        {Object.entries(res.categoryScores).map(([k, passed]) => (
                          <div key={k} className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded">
                            {passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            )}
                            <span className={`truncate text-[11px] ${passed ? 'text-slate-700' : 'text-rose-700 font-semibold'}`}>
                              {k}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900">
                      <span className="font-semibold">Diagnostic Report: </span>
                      {res.details}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
