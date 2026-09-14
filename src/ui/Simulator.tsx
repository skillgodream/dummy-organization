import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  PlusCircle, 
  Sparkles, 
  Send 
} from 'lucide-react';

export function Simulator() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  
  // Custom batch inputs
  const [customUnits, setCustomUnits] = useState<number>(55);
  const [customDurationMins, setCustomDurationMins] = useState<number>(60);
  const [customErrors, setCustomErrors] = useState<number>(0);
  
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/internal/employees');
    const data = await res.json();
    setEmployees(data);
    if (data.length > 0 && !selectedEmployee) {
      setSelectedEmployee(data[0].id);
    }
  };

  const fetchShifts = async () => {
    const res = await fetch('/api/internal/shifts');
    setShifts(await res.json());
  };

  const startShift = async () => {
    if (!selectedEmployee) return;
    try {
      await fetch('/api/internal/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee })
      });
      await fetchShifts();
      showNotification('Shift successfully started & broadcasted!');
    } catch (err: any) {
      showNotification('Failed to start shift');
    }
  };

  const endShift = async (shiftId: string) => {
    try {
      await fetch('/api/internal/shift/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId })
      });
      await fetchShifts();
      showNotification('Shift completed & clocked out.');
    } catch (err: any) {
      showNotification('Failed to end shift');
    }
  };

  const logPick = async (shiftId: string, units?: number, durationMins?: number, errors?: number) => {
    const actualUnits = units !== undefined ? units : customUnits;
    const actualDurationSecs = (durationMins !== undefined ? durationMins : customDurationMins) * 60;
    const actualErrors = errors !== undefined ? errors : customErrors;

    try {
      await fetch('/api/internal/task/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shiftId, 
          unitsProcessed: actualUnits, 
          durationSeconds: actualDurationSecs, 
          errorCount: actualErrors 
        })
      });
      await fetchShifts();
      showNotification(`Logged batch: ${actualUnits} units, ${actualErrors} errors (${durationMins || customDurationMins} mins)`);
    } catch (err: any) {
      showNotification('Failed to log pick batch');
    }
  };

  const logProblem = async (employeeId: string) => {
    try {
      await fetch('/api/internal/observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supervisorId: 'EMP-999', 
          employeeId, 
          noteType: 'ToolProblem' 
        })
      });
      showNotification('Tool problem reported & broadcasted to canonical stream.');
    } catch (err: any) {
      showNotification('Failed to log observation');
    }
  };

  const clearData = async () => {
    if (!confirm('Clear all active shifts and raw telemetry events?')) return;
    await fetch('/api/internal/clear', { method: 'POST' });
    await fetchShifts();
    showNotification('Cleared all simulation data.');
  };

  const runScenario = async (scenario: string) => {
    if (!selectedEmployee) return showNotification('Please select an employee first');
    try {
      await fetch(`/api/internal/scenario/${scenario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee })
      });
      await fetchShifts();
      showNotification(`Scenario ${scenario} executed & broadcasted!`);
    } catch (err: any) {
      showNotification(`Failed to run scenario ${scenario}`);
    }
  };

  const activeShifts = shifts.filter(s => s.status === 'Active');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Organization Simulator</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Emit raw warehouse telemetry, real-time shifts, task batches, and causal scenarios.
          </p>
        </div>

        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Shift Dispatcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">Shift Dispatcher</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Worker</label>
              <select 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium transition-all"
                value={selectedEmployee} 
                onChange={e => setSelectedEmployee(e.target.value)}
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id} • {e.role})</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              onClick={startShift}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Active Shift</span>
            </button>

            <button 
              type="button"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              onClick={clearData}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Active Telemetry</span>
            </button>
          </div>
        </div>

        {/* Card 2: Custom Number Batch Telemetry */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">Custom Number Batch Telemetry</h2>
            <span className="text-xs font-medium text-slate-500">Live Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Units Processed</label>
              <input 
                type="number"
                min={0}
                value={customUnits}
                onChange={e => setCustomUnits(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Duration (Minutes)</label>
              <input 
                type="number"
                min={1}
                value={customDurationMins}
                onChange={e => setCustomDurationMins(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Error Count</label>
              <input 
                type="number"
                min={0}
                value={customErrors}
                onChange={e => setCustomErrors(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-medium">
                Velocity: <strong className="text-slate-900">{((customUnits / (customDurationMins / 60)) || 0).toFixed(1)} /hr</strong>
              </span>
              <span className="text-slate-500 font-medium">
                Accuracy: <strong className="text-slate-900">{customUnits > 0 ? (((customUnits - customErrors) / customUnits) * 100).toFixed(1) : 0}%</strong>
              </span>
            </div>
            <span className="text-slate-400">Values will be applied to selected active shift batches</span>
          </div>
        </div>
      </div>

      {/* Simulation Scenarios */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Preset Causal Scenarios
        </h3>
        <p className="text-xs text-slate-500">
          Inject pre-defined multi-event causal chains for the selected worker:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {[
            { id: 'A', name: 'Scanner Failure', desc: 'Hardware breakdown & delays' },
            { id: 'B', name: 'High Performer', desc: 'Exceeds speed & 0 errors' },
            { id: 'C', name: 'Zone Congestion', desc: 'Aisle block bottleneck' },
            { id: 'D', name: 'High Error Rate', desc: 'Quality mistakes' },
            { id: 'E', name: 'Late Arrival', desc: 'Tardy check-in' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-all active:scale-95 group shadow-2xs"
              onClick={() => runScenario(s.id)}
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                Scenario {s.id}
              </div>
              <div className="text-[11px] font-medium text-slate-700 mt-0.5">{s.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Shifts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Active Shifts ({activeShifts.length})
          </h2>
          <span className="text-xs text-slate-500">Log telemetry or trigger worker events</span>
        </div>

        {activeShifts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No active shifts in progress</p>
            <p className="text-xs text-slate-400">Select a worker above and click "Start Active Shift" to begin emitting telemetry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeShifts.map(shift => {
              const emp = employees.find(e => e.id === shift.employeeId);
              return (
                <div key={shift.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{emp?.name || shift.employeeId}</h3>
                      <p className="text-xs font-mono text-slate-500">{shift.employeeId} • Shift #{shift.id.slice(-6)}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-md">
                      Active
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      type="button"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                      onClick={() => logPick(shift.id)}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log Custom Batch ({customUnits} units)</span>
                    </button>

                    <button 
                      type="button"
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      onClick={() => logProblem(shift.employeeId)}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Report Scanner Glitch</span>
                    </button>

                    <button 
                      type="button"
                      className="w-full py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      onClick={() => endShift(shift.id)}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Complete & Clock Out</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
