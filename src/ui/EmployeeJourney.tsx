import React, { useState, useEffect, useMemo } from 'react';
import { LAB_TARGETS } from '../org/targets.js';
import { 
  Check, 
  Save, 
  Trash2, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';

export function EmployeeJourney({ employee, onBack }: { employee: any, onBack: () => void }) {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [records, setRecords] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  
  // Section accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    A: true, // Work
    B: true, // Accuracy
    C: false, // Attendance
    D: false, // Skill
    E: false, // Support
    F: false, // Tool
    G: false, // Environment
    H: false  // Human Observation
  });

  const [prefeedDays, setPrefeedDays] = useState<number>(5);
  const [prefeedComplexity, setPrefeedComplexity] = useState<string>('Medium');
  const [isPrefeeding, setIsPrefeeding] = useState<boolean>(false);
  const [learnerState, setLearnerState] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const toggleAllSections = (expand: boolean) => {
    setExpandedSections({
      A: expand,
      B: expand,
      C: expand,
      D: expand,
      E: expand,
      F: expand,
      G: expand,
      H: expand
    });
  };

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/internal/lab/records/${employee.id}`);
      const data = await res.json();
      setRecords(data);
      loadFormData(data, selectedDay);
    } catch (err) {
      console.error('Failed to fetch records', err);
    }
  };

  const fetchLearnerState = async () => {
    try {
      const res = await fetch(`/api/internal/lab/learner-state/${employee.id}/${selectedDay}`);
      if (res.ok) {
        const data = await res.json();
        setLearnerState(data);
      }
    } catch (err) {
      console.error('Failed to fetch learner state', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line
  }, [employee.id]);

  useEffect(() => {
    setSaveStatus('idle');
    setSaveMessage(null);
    loadFormData(records, selectedDay);
    fetchLearnerState();
  }, [selectedDay, records]);

  const loadFormData = (allRecords: any[], day: number) => {
    const record = allRecords.find((r: any) => r.journeyDay === day);
    if (record) {
      setFormData({ ...record });
    } else {
      setFormData({
        employeeId: employee.id,
        journeyDay: day,
        taskType: 'Standard Pick',
        expectedUnits: 60,
        actualUnits: undefined,
        timeTakenMinutes: 60,
        shiftStatus: 'Present',
        errorCount: 0,
        attendanceStatus: 'Present',
        lateMinutes: 0,
        shiftCompleted: 'Yes',
        taskProficiency: 'Developing',
        assessmentScore: 90,
        trainingStatus: 'Completed',
        newTaskExposure: 'No',
        helpRequests: 1,
        escalationCount: 0,
        supervisorAssistance: 'No',
        toolStatus: 'Normal',
        downtimeMinutes: 0,
        workloadCondition: 'Normal'
      });
    }
  };

  // Live real-time calculations from whatever numbers are in formData
  const liveStats = useMemo(() => {
    const actual = formData.actualUnits !== undefined && formData.actualUnits !== null ? Number(formData.actualUnits) : null;
    const timeMins = formData.timeTakenMinutes !== undefined && formData.timeTakenMinutes !== null ? Number(formData.timeTakenMinutes) : 60;
    const errors = formData.errorCount !== undefined && formData.errorCount !== null ? Number(formData.errorCount) : 0;
    const expected = formData.expectedUnits !== undefined && formData.expectedUnits !== null ? Number(formData.expectedUnits) : 60;

    const velocity = actual !== null && timeMins > 0 ? (actual / (timeMins / 60)) : null;
    const accuracy = actual !== null && actual > 0 ? Math.max(0, ((actual - errors) / actual) * 100) : null;

    const prodTargetMet = velocity !== null ? velocity >= LAB_TARGETS.actualUnits.target : null;
    const accTargetMet = accuracy !== null ? accuracy >= LAB_TARGETS.accuracyPercentage.target : null;
    const errTargetMet = errors <= LAB_TARGETS.errorCount.target;

    return {
      actual,
      expected,
      timeMins,
      errors,
      velocity: velocity !== null ? Number(velocity.toFixed(1)) : null,
      accuracy: accuracy !== null ? Number(accuracy.toFixed(1)) : null,
      prodTargetMet,
      accTargetMet,
      errTargetMet
    };
  }, [formData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage(null);
    try {
      // Auto compute accuracy percentage if not explicitly given
      const payload = { ...formData };
      if (liveStats.accuracy !== null && payload.accuracyPercentage === undefined) {
        payload.accuracyPercentage = liveStats.accuracy;
      }

      const res = await fetch('/api/internal/lab/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Save failed');
      }

      await fetchRecords();
      await fetchLearnerState();
      setSaveStatus('success');
      setSaveMessage(`Day ${selectedDay} successfully saved & synced to cloud!`);
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage(null);
      }, 4000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDay = async () => {
    if (!confirm(`Are you sure you want to clear Day ${selectedDay}?`)) return;
    await fetch(`/api/internal/lab/record/${employee.id}/${selectedDay}`, { method: 'DELETE' });
    await fetchRecords();
    await fetchLearnerState();
  };

  const handleRestartJourney = async () => {
    if (!confirm('Are you sure you want to completely restart this 10-day journey? This will delete all days for this employee.')) return;
    await fetch(`/api/internal/lab/journey/${employee.id}`, { method: 'DELETE' });
    await fetchRecords();
    setSelectedDay(0);
  };

  const handlePrefeed = async () => {
    setIsPrefeeding(true);
    try {
      await fetch('/api/internal/lab/prefeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          days: prefeedDays,
          complexity: prefeedComplexity
        })
      });
      await fetchRecords();
      setSelectedDay(0);
      setSaveStatus('success');
      setSaveMessage(`Pre-fed ${prefeedDays} days of longitudinal evidence!`);
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrefeeding(false);
    }
  };

  const isPopulated = (day: number) => records.some(r => r.journeyDay === day);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10">
      
      {/* LEFT COLUMN - NAVIGATION & TIMELINE */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
        <div>
          <button 
            onClick={onBack} 
            className="min-h-[44px] text-sm font-medium text-slate-500 hover:text-slate-900 mb-3 flex items-center gap-2 transition-colors py-2 -ml-2 px-3 rounded-lg active:bg-slate-100"
          >
            ← Back to Lab
          </button>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{employee.name}</h1>
            <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{employee.id} • {employee.role}</p>
          </div>
        </div>

        {/* 10-Day Journey Selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">10-Day Timeline</h3>
            <span className="text-xs font-medium text-slate-500">{records.length}/11 populated</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 11 }).map((_, i) => {
              const populated = isPopulated(i);
              const isSelected = selectedDay === i;
              return (
                <button
                  key={i}
                  type="button"
                  id={`day-select-btn-${i}`}
                  onClick={() => setSelectedDay(i)}
                  className={`relative min-h-[44px] py-2 flex flex-col items-center justify-center rounded-xl border text-xs font-medium transition-all active:scale-95 touch-manipulation ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200 font-bold' 
                      : populated 
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:border-emerald-300' 
                        : 'border-slate-200 bg-slate-50/60 text-slate-400 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <span>D{i}</span>
                  {populated && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>
          
          <button 
            type="button"
            onClick={handleRestartJourney}
            className="w-full py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors active:bg-red-100 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Days</span>
          </button>
        </div>

        {/* History Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Journey History</h3>
          {records.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No days recorded yet. Pre-feed history or save a day.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 pb-2">
                    <th className="pb-2 font-semibold">Day</th>
                    <th className="pb-2 font-semibold">Units</th>
                    <th className="pb-2 font-semibold">Errors</th>
                    <th className="pb-2 font-semibold">Acc%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.sort((a,b) => a.journeyDay - b.journeyDay).map(r => (
                    <tr 
                      key={r.journeyDay} 
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedDay === r.journeyDay ? 'bg-indigo-50/60 font-semibold' : ''}`} 
                      onClick={() => setSelectedDay(r.journeyDay)}
                    >
                      <td className="py-2 text-slate-900">Day {r.journeyDay}</td>
                      <td className="py-2 text-slate-700">{r.actualUnits ?? '-'}</td>
                      <td className="py-2 text-slate-700">{r.errorCount ?? 0}</td>
                      <td className="py-2 text-slate-700">
                        {r.accuracyPercentage != null 
                          ? `${r.accuracyPercentage}%` 
                          : (r.actualUnits ? `${Math.max(0, ((r.actualUnits - (r.errorCount || 0)) / r.actualUnits) * 100).toFixed(0)}%` : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN - DATA ENTRY & LIVE POPULATION */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* PRE-FEED HISTORY BLOCK */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Pre-Feed Historical Evidence
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Quickly populate days with realistic warehouse shifts.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Days to Populate</label>
              <select 
                value={prefeedDays} 
                onChange={e => setPrefeedDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
              >
                {[1, 2, 3, 5, 7, 10].map(d => (
                  <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''} (Day 0 to {d-1})</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Pattern / Complexity</label>
              <select 
                value={prefeedComplexity} 
                onChange={e => setPrefeedComplexity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
              >
                {['Low', 'Medium', 'High', 'Very High'].map(c => (
                  <option key={c} value={c}>{c} Complexity</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              id="btn-prefeed-generate"
              onClick={handlePrefeed}
              disabled={isPrefeeding}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isPrefeeding ? 'Populating...' : 'Populate Days'}</span>
            </button>
          </div>
        </div>

        {/* LIVE POPULATION SUMMARY (Updates INSTANTLY as user changes numbers) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-slate-900">Day {selectedDay} Live Calculations & Metrics</h3>
              </div>
              <p className="text-xs text-slate-500">Instant evaluation feedback based on the numbers entered below</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : `Save Day ${selectedDay}`}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Pick Velocity</span>
              <div className="text-lg font-bold text-slate-900">
                {liveStats.velocity !== null ? `${liveStats.velocity} /hr` : '—'}
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block mt-1 ${
                liveStats.prodTargetMet === true ? 'bg-emerald-100 text-emerald-800' :
                liveStats.prodTargetMet === false ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {liveStats.prodTargetMet === true ? '✓ Target Met (≥60)' : liveStats.prodTargetMet === false ? '⚠ Behind Target (<60)' : 'Awaiting units'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Calculated Accuracy</span>
              <div className="text-lg font-bold text-slate-900">
                {liveStats.accuracy !== null ? `${liveStats.accuracy}%` : '—'}
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block mt-1 ${
                liveStats.accTargetMet === true ? 'bg-emerald-100 text-emerald-800' :
                liveStats.accTargetMet === false ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {liveStats.accTargetMet === true ? '✓ Target Met (≥98%)' : liveStats.accTargetMet === false ? '✗ Below Target (<98%)' : 'Awaiting input'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Errors Logged</span>
              <div className="text-lg font-bold text-slate-900">
                {liveStats.errors}
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block mt-1 ${
                liveStats.errTargetMet ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {liveStats.errTargetMet ? '✓ ≤ 2 Errors' : '✗ High Errors (>2)'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Assessment</span>
              <div className="text-lg font-bold text-slate-900">
                {formData.assessmentScore !== undefined && formData.assessmentScore !== null ? `${formData.assessmentScore}%` : '—'}
              </div>
              <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md inline-block mt-1">
                Proficiency: {formData.taskProficiency || 'Developing'}
              </span>
            </div>
          </div>
        </div>

        {/* DAY EVIDENCE FORM */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Day {selectedDay} Evidence Inputs</h2>
                <p className="text-xs text-slate-500">Edit fields below to populate canonical signals</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllSections(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllSections(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Collapse All
                </button>
                {isPopulated(selectedDay) && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* Section A - Work */}
              <AccordionSection 
                title="Section A — Work & Productivity" 
                isOpen={expandedSections.A} 
                onToggle={() => toggleSection('A')}
                badge={formData.actualUnits ? `${formData.actualUnits} units` : undefined}
              >
                <Input 
                  label="Task Type" 
                  type="text" 
                  value={formData.taskType} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, taskType: v }))} 
                />
                <Input 
                  label="Expected Units" 
                  type="number" 
                  min={0} 
                  value={formData.expectedUnits} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, expectedUnits: v !== '' ? Number(v) : undefined }))} 
                />
                <Input 
                  label="Actual Units" 
                  type="number" 
                  min={0} 
                  targetKey="actualUnits" 
                  value={formData.actualUnits} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, actualUnits: v !== '' ? Number(v) : undefined }))} 
                />
                <Input 
                  label="Time Taken (Minutes)" 
                  type="number" 
                  min={0} 
                  targetKey="timeTakenMinutes" 
                  value={formData.timeTakenMinutes} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, timeTakenMinutes: v !== '' ? Number(v) : undefined }))} 
                />
                <Select 
                  label="Shift Status" 
                  options={['Present', 'Late', 'Absent', 'Partial', 'Not Available']} 
                  value={formData.shiftStatus} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, shiftStatus: v }))} 
                />
              </AccordionSection>

              {/* Section B - Accuracy */}
              <AccordionSection 
                title="Section B — Quality & Accuracy" 
                isOpen={expandedSections.B} 
                onToggle={() => toggleSection('B')}
                badge={liveStats.accuracy !== null ? `${liveStats.accuracy}%` : undefined}
              >
                <Input 
                  label="Error Count" 
                  type="number" 
                  min={0} 
                  targetKey="errorCount" 
                  value={formData.errorCount} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, errorCount: v !== '' ? Number(v) : undefined }))} 
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <label className="text-slate-900 font-medium">Accuracy % (Auto-calculated)</label>
                    <span className="text-[11px] font-medium text-slate-400">Target: ≥98%</span>
                  </div>
                  <input 
                    type="number" 
                    min={0} 
                    max={100} 
                    step="0.1"
                    value={formData.accuracyPercentage !== undefined && formData.accuracyPercentage !== null ? formData.accuracyPercentage : (liveStats.accuracy !== null ? liveStats.accuracy : '')} 
                    onChange={e => setFormData((prev: any) => ({ ...prev, accuracyPercentage: e.target.value !== '' ? Number(e.target.value) : undefined }))} 
                    className="min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                    placeholder="Enter accuracy %"
                  />
                </div>
              </AccordionSection>

              {/* Section C - Attendance */}
              <AccordionSection 
                title="Section C — Attendance & Punctuality" 
                isOpen={expandedSections.C} 
                onToggle={() => toggleSection('C')}
              >
                <Select 
                  label="Attendance Status" 
                  options={['Present', 'Late', 'Absent', 'Partial', 'Not Available']} 
                  value={formData.attendanceStatus} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, attendanceStatus: v }))} 
                />
                <Input 
                  label="Late Minutes" 
                  type="number" 
                  min={0} 
                  value={formData.lateMinutes} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, lateMinutes: v !== '' ? Number(v) : undefined }))} 
                />
                <Select 
                  label="Shift Completed" 
                  options={['Yes', 'No', 'Not Available']} 
                  value={formData.shiftCompleted} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, shiftCompleted: v }))} 
                />
              </AccordionSection>

              {/* Section D - Skill & Learning */}
              <AccordionSection 
                title="Section D — Skill & Learning" 
                isOpen={expandedSections.D} 
                onToggle={() => toggleSection('D')}
              >
                <Select 
                  label="Task Proficiency" 
                  options={['Low', 'Developing', 'Competent', 'Strong', 'Not Available']} 
                  value={formData.taskProficiency} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, taskProficiency: v }))} 
                />
                <Input 
                  label="Assessment Score (%)" 
                  type="number" 
                  min={0} 
                  max={100} 
                  targetKey="assessmentScore" 
                  value={formData.assessmentScore} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, assessmentScore: v !== '' ? Number(v) : undefined }))} 
                />
                <Select 
                  label="Training Status" 
                  options={['Completed', 'Not Completed', 'In Progress', 'Not Available']} 
                  value={formData.trainingStatus} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, trainingStatus: v }))} 
                />
                <Select 
                  label="New Task Exposure" 
                  options={['No', 'Yes', 'Not Available']} 
                  value={formData.newTaskExposure} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, newTaskExposure: v }))} 
                />
              </AccordionSection>

              {/* Section E - Support */}
              <AccordionSection 
                title="Section E — Support & Escalations" 
                isOpen={expandedSections.E} 
                onToggle={() => toggleSection('E')}
              >
                <Input 
                  label="Help Requests" 
                  type="number" 
                  min={0} 
                  targetKey="helpRequests" 
                  value={formData.helpRequests} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, helpRequests: v !== '' ? Number(v) : undefined }))} 
                />
                <Input 
                  label="Escalation Count" 
                  type="number" 
                  min={0} 
                  value={formData.escalationCount} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, escalationCount: v !== '' ? Number(v) : undefined }))} 
                />
                <Select 
                  label="Supervisor Assistance" 
                  options={['No', 'Yes', 'Not Available']} 
                  value={formData.supervisorAssistance} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, supervisorAssistance: v }))} 
                />
              </AccordionSection>

              {/* Section F - Tool & System */}
              <AccordionSection 
                title="Section F — Tool & System Downtime" 
                isOpen={expandedSections.F} 
                onToggle={() => toggleSection('F')}
              >
                <Select 
                  label="Tool Status" 
                  options={['Normal', 'Intermittent', 'Failed', 'Not Available']} 
                  value={formData.toolStatus} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, toolStatus: v }))} 
                />
                <Input 
                  label="Tool Issue Details" 
                  type="text" 
                  value={formData.toolIssue} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, toolIssue: v }))} 
                />
                <Input 
                  label="Downtime (Minutes)" 
                  type="number" 
                  min={0} 
                  targetKey="downtimeMinutes" 
                  value={formData.downtimeMinutes} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, downtimeMinutes: v !== '' ? Number(v) : undefined }))} 
                />
              </AccordionSection>

              {/* Section G - Environment */}
              <AccordionSection 
                title="Section G — Environment & Workload" 
                isOpen={expandedSections.G} 
                onToggle={() => toggleSection('G')}
              >
                <Select 
                  label="Workload Condition" 
                  options={['Normal', 'Low', 'High', 'Very High', 'Not Available']} 
                  value={formData.workloadCondition} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, workloadCondition: v }))} 
                />
                <Input 
                  label="Congestion Issue" 
                  type="text" 
                  value={formData.congestionIssue} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, congestionIssue: v }))} 
                />
                <Input 
                  label="Environment Issue" 
                  type="text" 
                  value={formData.environmentIssue} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, environmentIssue: v }))} 
                />
              </AccordionSection>

              {/* Section H - Observation */}
              <AccordionSection 
                title="Section H — Human Observation Notes" 
                isOpen={expandedSections.H} 
                onToggle={() => toggleSection('H')}
              >
                <TextArea 
                  label="Supervisor Observation" 
                  value={formData.supervisorObservation} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, supervisorObservation: v }))} 
                />
                <TextArea 
                  label="Behavior Observation" 
                  value={formData.behaviorObservation} 
                  onChange={v => setFormData((prev: any) => ({ ...prev, behaviorObservation: v }))} 
                />
              </AccordionSection>
            </div>

            {/* Bottom Form Actions & Status */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button 
                type="button" 
                onClick={handleClearDay}
                disabled={isSaving}
                className="w-full sm:w-auto py-2.5 px-4 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Day {selectedDay}</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                {saveStatus === 'success' && saveMessage && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveMessage}</span>
                  </span>
                )}
                {saveStatus === 'error' && saveMessage && (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{saveMessage}</span>
                  </span>
                )}
                <button 
                  type="submit"
                  id="btn-save-day"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 active:scale-95 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving & Broadcasting...' : `Save & Sync Day ${selectedDay}`}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AccordionSection({ 
  title, 
  isOpen, 
  onToggle, 
  badge,
  children 
}: { 
  title: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  badge?: string;
  children: React.ReactNode; 
}) {
  return (
    <div className={`border rounded-xl transition-all overflow-hidden ${isOpen ? 'border-slate-300 shadow-xs bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full min-h-[44px] px-4 py-3 bg-slate-50/70 flex justify-between items-center text-left focus:outline-none hover:bg-slate-100/60 active:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ 
  label, 
  type, 
  value, 
  onChange, 
  min, 
  max, 
  targetKey 
}: { 
  label: string; 
  type: string; 
  value: any; 
  onChange: (v: string) => void; 
  min?: number; 
  max?: number; 
  targetKey?: keyof typeof LAB_TARGETS; 
}) {
  const target = targetKey ? LAB_TARGETS[targetKey] : null;
  // Robust display value that displays 0 correctly
  const displayVal = value !== undefined && value !== null ? value : '';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <label className="text-slate-800 font-medium">{label}</label>
        {target && (
          <span className="text-[11px] font-semibold text-slate-400">
            Target: {target.operator} {target.target}{target.unit}
          </span>
        )}
      </div>
      <input 
        type={type} 
        value={displayVal} 
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)} 
        className="min-h-[44px] px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
        placeholder="Enter number or value"
      />
    </div>
  );
}

function Select({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  value: any; 
  onChange: (v: string) => void; 
}) {
  const displayVal = value !== undefined && value !== null ? value : '';
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-slate-800 font-medium">{label}</label>
      <select 
        value={displayVal} 
        onChange={e => onChange(e.target.value)} 
        className="min-h-[44px] px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium"
      >
        <option value="">Select option...</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: any; 
  onChange: (v: string) => void; 
}) {
  const displayVal = value !== undefined && value !== null ? value : '';
  return (
    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
      <label className="text-xs text-slate-800 font-medium">{label}</label>
      <textarea 
        value={displayVal} 
        onChange={e => onChange(e.target.value)} 
        rows={2}
        className="min-h-[44px] px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
        placeholder="Observation details..."
      />
    </div>
  );
}
