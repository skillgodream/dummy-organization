import React, { useState, useEffect } from 'react';
import { LAB_TARGETS } from '../org/targets.js';

export function EmployeeJourney({ employee, onBack }: { employee: any, onBack: () => void }) {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [records, setRecords] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  
  const [activeSection, setActiveSection] = useState<string>('A');
  const [prefeedDays, setPrefeedDays] = useState<number>(5);
  const [prefeedComplexity, setPrefeedComplexity] = useState<string>('Medium');
  const [isPrefeeding, setIsPrefeeding] = useState<boolean>(false);
  const [learnerState, setLearnerState] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchRecords = async () => {
    const res = await fetch(`/api/internal/lab/records/${employee.id}`);
    const data = await res.json();
    setRecords(data);
    loadFormData(data, selectedDay);
  };

  const fetchLearnerState = async () => {
    const res = await fetch(`/api/internal/lab/learner-state/${employee.id}/${selectedDay}`);
    if (res.ok) {
      const data = await res.json();
      setLearnerState(data);
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
      setFormData(record);
    } else {
      setFormData({ employeeId: employee.id, journeyDay: day });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage(null);
    try {
      const res = await fetch('/api/internal/lab/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        throw new Error('Save failed');
      }
      await fetchRecords();
      setSaveStatus('success');
      setSaveMessage('Saved successfully');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage(null);
      }, 4000);
    } catch (err) {
      setSaveStatus('error');
      setSaveMessage('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDay = async () => {
    if (!confirm(`Are you sure you want to clear Day ${selectedDay}?`)) return;
    await fetch(`/api/internal/lab/record/${employee.id}/${selectedDay}`, { method: 'DELETE' });
    fetchRecords();
  };

  const handleRestartJourney = async () => {
    if (!confirm('Are you sure you want to completely restart this 10-day journey? This will delete all days for this employee.')) return;
    await fetch(`/api/internal/lab/journey/${employee.id}`, { method: 'DELETE' });
    fetchRecords();
    setSelectedDay(0);
  };

  const handlePrefeed = async () => {
    const existingDays = Array.from({ length: prefeedDays }).filter((_, i) => records.some(r => r.journeyDay === i));
    if (existingDays.length > 0) {
      if (!confirm(`Days 0 to ${prefeedDays - 1} already contain data. Pre-feed will replace these records. Continue?`)) {
        return;
      }
    }
    
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
    } finally {
      setIsPrefeeding(false);
    }
  };

  const isPopulated = (day: number) => records.some(r => r.journeyDay === day);

  const derivedAccuracy = formData.actualUnits !== undefined && formData.errorCount !== undefined 
    ? Math.max(0, ((formData.actualUnits - formData.errorCount) / formData.actualUnits) * 100).toFixed(1)
    : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* LEFT COLUMN - NAVIGATION & HISTORY */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6 lg:gap-10">
        <div>
          <button onClick={onBack} className="min-h-[44px] text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-2 transition-colors py-2 -ml-2 px-3 rounded-lg active:bg-slate-100">
            ← Back to Lab
          </button>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mb-1">{employee.name}</h1>
          <p className="text-sm font-mono font-medium text-slate-500">{employee.id}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-widest">10-Day Journey</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }).map((_, i) => {
              const populated = isPopulated(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={`relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl border text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                    selectedDay === i 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                      : populated 
                        ? 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300' 
                        : 'border-slate-200 bg-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  D{i}
                  {populated && selectedDay !== i && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-900 rounded-full"></span>}
                </button>
              );
            })}
          </div>
          
          <button 
            type="button"
            onClick={handleRestartJourney}
            className="mt-5 w-full min-h-[44px] py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors active:bg-red-100/60"
          >
            Restart Journey
          </button>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest whitespace-nowrap">History Overview</h3>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No days populated yet.</p>
          ) : (
            <table className="w-full text-sm text-left min-w-[200px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="pb-3 font-semibold">Day</th>
                  <th className="pb-3 font-semibold">Prod.</th>
                  <th className="pb-3 font-semibold">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {records.sort((a,b) => a.journeyDay - b.journeyDay).map(r => (
                  <tr key={r.journeyDay} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedDay(r.journeyDay)}>
                    <td className="py-3 font-medium text-slate-900">Day {r.journeyDay}</td>
                    <td className="py-3 text-slate-600">{r.actualUnits ?? '-'}</td>
                    <td className="py-3 text-slate-600">{r.accuracyPercentage != null ? `${r.accuracyPercentage}%` : (r.actualUnits && r.errorCount ? `${Math.max(0, ((r.actualUnits - r.errorCount) / r.actualUnits) * 100).toFixed(1)}%` : '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN - DATA ENTRY */}
      <div className="flex-1 flex flex-col gap-6 lg:gap-8 min-w-0">
        
        {/* PRE-FEED HISTORY BLOCK */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 md:p-8 lg:p-10">
          <div className="border-b border-slate-100 pb-5 sm:pb-6 mb-5 sm:mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Pre-Feed History</h2>
            <p className="text-sm text-slate-500 mt-1">Deterministically generate historical journey evidence for Dean laboratory testing.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 sm:gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-900 mb-2">Days of History</label>
              <select 
                value={prefeedDays} 
                onChange={e => setPrefeedDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                {[1, 2, 3, 5, 7, 10].map(d => (
                  <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-900 mb-2">Complexity</label>
              <select 
                value={prefeedComplexity} 
                onChange={e => setPrefeedComplexity(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                {['Low', 'Medium', 'High', 'Very High'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              onClick={handlePrefeed}
              disabled={isPrefeeding}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all disabled:opacity-50"
            >
              {isPrefeeding ? 'Generating...' : 'Pre-Feed Data'}
            </button>
          </div>
        </div>

        {/* LEARNER STATE READ-ONLY BLOCK */}
        {learnerState && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 md:p-8 lg:p-10">
             <div className="border-b border-slate-200 pb-5 mb-5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Learner State</h2>
                <p className="text-sm text-slate-500 mt-1">Day {selectedDay} — Structured representation of canonical evidence</p>
              </div>
              <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-md font-medium tracking-wide uppercase">Read Only</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Performance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Productivity</span>
                    <span className="font-medium text-slate-900">{learnerState.performance.productivity_actual ?? '-'} / {learnerState.performance.productivity_target ?? '-'} {learnerState.performance.productivity_unit ?? ''}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Trend</span>
                    <span className="font-medium text-slate-900 capitalize">{learnerState.trend.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Accuracy</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Accuracy Score</span>
                    <span className="font-medium text-slate-900">{learnerState.accuracy.accuracy_actual ?? '-'}% / {learnerState.accuracy.accuracy_target ?? '-'}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Errors</span>
                    <span className="font-medium text-slate-900">{learnerState.accuracy.error_count ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Capability</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Proficiency</span>
                    <span className="font-medium text-slate-900">{learnerState.capability.task_proficiency ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Assessment</span>
                    <span className="font-medium text-slate-900">{learnerState.capability.assessment ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Attendance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Status</span>
                    <span className="font-medium text-slate-900">{learnerState.attendance.attendance_status ?? learnerState.attendance.shift_status ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Late (min)</span>
                    <span className="font-medium text-slate-900">{learnerState.attendance.late_minutes ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Support</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Help Requests</span>
                    <span className="font-medium text-slate-900">{learnerState.support.help_requests ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Escalations</span>
                    <span className="font-medium text-slate-900">{learnerState.support.escalation_count ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Environment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Tool Status</span>
                    <span className="font-medium text-slate-900">{learnerState.environment.tool_status ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-500">Workload</span>
                    <span className="font-medium text-slate-900">{learnerState.environment.workload_condition ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 lg:col-span-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Evidence Quality</h3>
                <div className="flex flex-col sm:flex-row gap-6 text-sm">
                  <div className="flex-1">
                    <span className="text-slate-500 block mb-1">Historical Days</span>
                    <span className="font-medium text-slate-900">{learnerState.evidence_quality.historical_days_available}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-500 block mb-1">Missing Evidence</span>
                    <span className="font-medium text-slate-900">{learnerState.evidence_quality.missing_fields_count} fields</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* DAY EVIDENCE ENTRY */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <form onSubmit={handleSave} className="p-5 sm:p-6 md:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-slate-100">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Day {selectedDay} Evidence</h2>
              {isPopulated(selectedDay) && (
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-md font-medium tracking-wide uppercase">Saved</span>
              )}
            </div>

          <div className="space-y-4 mb-8">
            <ExpandableSection title="Section A — Work" isActive={activeSection === 'A'} onToggle={() => setActiveSection(activeSection === 'A' ? '' : 'A')}>
              <Input label="Task Type" type="text" value={formData.taskType} onChange={v => setFormData({...formData, taskType: v})} />
              <Input label="Expected Units" type="number" min={0} value={formData.expectedUnits} onChange={v => setFormData({...formData, expectedUnits: v ? Number(v) : undefined})} />
              <Input label="Actual Units" type="number" min={0} targetKey="actualUnits" value={formData.actualUnits} onChange={v => setFormData({...formData, actualUnits: v ? Number(v) : undefined})} />
              <Input label="Time Taken" type="number" min={0} targetKey="timeTakenMinutes" value={formData.timeTakenMinutes} onChange={v => setFormData({...formData, timeTakenMinutes: v ? Number(v) : undefined})} />
              <Select label="Shift Status" options={['', 'Present', 'Late', 'Absent', 'Partial', 'Not Available']} value={formData.shiftStatus} onChange={v => setFormData({...formData, shiftStatus: v})} />
            </ExpandableSection>

            <ExpandableSection title="Section B — Accuracy" isActive={activeSection === 'B'} onToggle={() => setActiveSection(activeSection === 'B' ? '' : 'B')}>
              <Input label="Error Count" type="number" min={0} targetKey="errorCount" value={formData.errorCount} onChange={v => setFormData({...formData, errorCount: v ? Number(v) : undefined})} />
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-sm">
                  <label className="text-slate-900 font-medium">Accuracy %</label>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Target: {LAB_TARGETS.accuracyPercentage.operator} {LAB_TARGETS.accuracyPercentage.target}{LAB_TARGETS.accuracyPercentage.unit}</span>
                </div>
                {derivedAccuracy ? (
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium tracking-wide">
                    Calculated: {derivedAccuracy}%
                  </div>
                ) : (
                  <input 
                    type="number" min={0} max={100} step="0.1"
                    value={formData.accuracyPercentage || ''} 
                    onChange={e => setFormData({...formData, accuracyPercentage: e.target.value ? Number(e.target.value) : undefined})} 
                    className="px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                    placeholder="Enter actual"
                  />
                )}
              </div>
            </ExpandableSection>

            <ExpandableSection title="Section C — Attendance" isActive={activeSection === 'C'} onToggle={() => setActiveSection(activeSection === 'C' ? '' : 'C')}>
              <Select label="Attendance Status" options={['', 'Present', 'Late', 'Absent', 'Partial', 'Not Available']} value={formData.attendanceStatus} onChange={v => setFormData({...formData, attendanceStatus: v})} />
              <Input label="Late Minutes" type="number" min={0} value={formData.lateMinutes} onChange={v => setFormData({...formData, lateMinutes: v ? Number(v) : undefined})} />
              <Select label="Shift Completed" options={['', 'Yes', 'No', 'Not Available']} value={formData.shiftCompleted} onChange={v => setFormData({...formData, shiftCompleted: v})} />
            </ExpandableSection>

            <ExpandableSection title="Section D — Skill / Learning" isActive={activeSection === 'D'} onToggle={() => setActiveSection(activeSection === 'D' ? '' : 'D')}>
              <Select label="Task Proficiency" options={['', 'Low', 'Developing', 'Competent', 'Strong', 'Not Available']} value={formData.taskProficiency} onChange={v => setFormData({...formData, taskProficiency: v})} />
              <Input label="Assessment Score" type="number" min={0} max={100} targetKey="assessmentScore" value={formData.assessmentScore} onChange={v => setFormData({...formData, assessmentScore: v ? Number(v) : undefined})} />
              <Select label="Training Status" options={['', 'Completed', 'Not Completed', 'In Progress', 'Not Available']} value={formData.trainingStatus} onChange={v => setFormData({...formData, trainingStatus: v})} />
              <Select label="New Task Exposure" options={['', 'Yes', 'No', 'Not Available']} value={formData.newTaskExposure} onChange={v => setFormData({...formData, newTaskExposure: v})} />
            </ExpandableSection>

            <ExpandableSection title="Section E — Support" isActive={activeSection === 'E'} onToggle={() => setActiveSection(activeSection === 'E' ? '' : 'E')}>
              <Input label="Help Requests" type="number" min={0} targetKey="helpRequests" value={formData.helpRequests} onChange={v => setFormData({...formData, helpRequests: v ? Number(v) : undefined})} />
              <Input label="Escalation Count" type="number" min={0} value={formData.escalationCount} onChange={v => setFormData({...formData, escalationCount: v ? Number(v) : undefined})} />
              <Select label="Supervisor Assistance" options={['', 'Yes', 'No', 'Not Available']} value={formData.supervisorAssistance} onChange={v => setFormData({...formData, supervisorAssistance: v})} />
            </ExpandableSection>

            <ExpandableSection title="Section F — Tool / System" isActive={activeSection === 'F'} onToggle={() => setActiveSection(activeSection === 'F' ? '' : 'F')}>
              <Select label="Tool Status" options={['', 'Normal', 'Intermittent', 'Failed', 'Not Available']} value={formData.toolStatus} onChange={v => setFormData({...formData, toolStatus: v})} />
              <Input label="Tool Issue" type="text" value={formData.toolIssue} onChange={v => setFormData({...formData, toolIssue: v})} />
              <Input label="Downtime (mins)" type="number" min={0} targetKey="downtimeMinutes" value={formData.downtimeMinutes} onChange={v => setFormData({...formData, downtimeMinutes: v ? Number(v) : undefined})} />
            </ExpandableSection>

            <ExpandableSection title="Section G — Environment" isActive={activeSection === 'G'} onToggle={() => setActiveSection(activeSection === 'G' ? '' : 'G')}>
              <Select label="Workload Condition" options={['', 'Low', 'Normal', 'High', 'Very High', 'Not Available']} value={formData.workloadCondition} onChange={v => setFormData({...formData, workloadCondition: v})} />
              <Input label="Congestion Issue" type="text" value={formData.congestionIssue} onChange={v => setFormData({...formData, congestionIssue: v})} />
              <Input label="Environment Issue" type="text" value={formData.environmentIssue} onChange={v => setFormData({...formData, environmentIssue: v})} />
            </ExpandableSection>

            <ExpandableSection title="Section H — Human Observation" isActive={activeSection === 'H'} onToggle={() => setActiveSection(activeSection === 'H' ? '' : 'H')}>
              <TextArea label="Supervisor Observation" value={formData.supervisorObservation} onChange={v => setFormData({...formData, supervisorObservation: v})} />
              <TextArea label="Behavior Observation" value={formData.behaviorObservation} onChange={v => setFormData({...formData, behaviorObservation: v})} />
              <TextArea label="Communication Observation" value={formData.communicationObservation} onChange={v => setFormData({...formData, communicationObservation: v})} />
            </ExpandableSection>
          </div>

          <div className="mt-8 border-t border-slate-200 bg-slate-50 -mx-5 sm:-mx-6 md:-mx-8 lg:-mx-10 -mb-5 sm:-mb-6 md:-mb-8 lg:-mb-10 p-5 sm:p-6 md:p-8 lg:p-10 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
            <button 
              type="button" 
              onClick={handleClearDay}
              disabled={isSaving}
              className="w-full sm:w-auto py-3 sm:py-2 px-4 -ml-4 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 sm:hover:bg-transparent rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Clear Day {selectedDay}
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
              {saveStatus === 'success' && saveMessage && (
                <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saveMessage}
                </span>
              )}
              {saveStatus === 'error' && saveMessage && (
                <span className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {saveMessage}
                </span>
              )}
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  `Save Day ${selectedDay}`
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

function ExpandableSection({ title, isActive, onToggle, children }: { title: string, isActive: boolean, onToggle: () => void, children: React.ReactNode }) {
  return (
    <div className={`border rounded-xl transition-all overflow-hidden ${isActive ? 'border-slate-300 shadow-xs bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full min-h-[44px] px-4 sm:px-6 py-3.5 bg-slate-50 flex justify-between items-center text-left focus:outline-none hover:bg-slate-100/60 active:bg-slate-100 transition-colors"
      >
        <h3 className={`text-xs sm:text-sm font-semibold uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
          {title}
        </h3>
        <svg 
          className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 shrink-0 ${isActive ? 'rotate-180 text-slate-600' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isActive && (
        <div className="px-4 sm:px-6 py-5 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, type, value, onChange, min, max, targetKey }: { label: string, type: string, value: any, onChange: (v: string) => void, min?: number, max?: number, targetKey?: keyof typeof LAB_TARGETS }) {
  const target = targetKey ? LAB_TARGETS[targetKey] : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-sm">
        <label className="text-slate-900 font-medium">{label}</label>
        {target && (
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Target: {target.operator} {target.target} {target.unit}</span>
        )}
      </div>
      <input 
        type={type} 
        value={value || ''} 
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)} 
        className="min-h-[44px] px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
        placeholder="Enter actual"
      />
    </div>
  );
}

function Select({ label, options, value, onChange }: { label: string, options: string[], value: any, onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-900 font-medium">{label}</label>
      <select 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        className="min-h-[44px] px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
      >
        {options.map(o => (
          <option key={o} value={o}>{o || 'Select...'}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string, value: any, onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
      <label className="text-sm text-slate-900 font-medium">{label}</label>
      <textarea 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        rows={2}
        className="min-h-[44px] px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
      />
    </div>
  );
}
