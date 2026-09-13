import React, { useState, useEffect } from 'react';

export function Simulator() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  
  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  const fetchEmployees = async () => {
    const res = await fetch('/api/internal/employees');
    setEmployees(await res.json());
  };

  const fetchShifts = async () => {
    const res = await fetch('/api/internal/shifts');
    setShifts(await res.json());
  };

  const startShift = async () => {
    if (!selectedEmployee) return;
    await fetch('/api/internal/shift/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedEmployee })
    });
    fetchShifts();
  };

  const endShift = async (shiftId: string) => {
    await fetch('/api/internal/shift/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId })
    });
    fetchShifts();
  };

  const logPick = async (shiftId: string) => {
    await fetch('/api/internal/task/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        shiftId, 
        unitsProcessed: Math.floor(Math.random() * 50) + 10, 
        durationSeconds: Math.floor(Math.random() * 1200) + 600, 
        errorCount: Math.random() > 0.8 ? 1 : 0 
      })
    });
    alert('Pick Batch Logged');
  };

  const logProblem = async (employeeId: string) => {
    await fetch('/api/internal/observation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        supervisorId: 'EMP-999', 
        employeeId, 
        noteType: 'ToolProblem' 
      })
    });
    alert('Tool Problem Logged');
  };

  const clearData = async () => {
    await fetch('/api/internal/clear', { method: 'POST' });
    fetchShifts();
  };

  const activeShifts = shifts.filter(s => s.status === 'Active');

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl font-semibold mb-6 text-slate-900">Organization Simulator</h1>
      
      <div className="mb-12">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-slate-400 mb-6">Control Panel</h2>
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            value={selectedEmployee} 
            onChange={e => setSelectedEmployee(e.target.value)}
          >
            <option value="">Select Employee...</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
          <button 
            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium active:scale-95 transition-all"
            onClick={startShift}
          >
            Start Shift
          </button>
          
          <button 
            className="px-6 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 active:bg-slate-100 ml-auto transition-all"
            onClick={clearData}
          >
            Clear All Data
          </button>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest">Run Predefined Simulation Scenario</h3>
          <div className="flex flex-wrap gap-3">
            {['A', 'B', 'C', 'D', 'E'].map(scenario => (
              <button
                key={scenario}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:border-slate-300 active:bg-slate-50 text-sm transition-all shadow-sm"
                onClick={async () => {
                  if (!selectedEmployee) return alert('Select an employee first');
                  await fetch(`/api/internal/scenario/${scenario}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employeeId: selectedEmployee })
                  });
                  fetchShifts();
                }}
              >
                Scenario {scenario}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold tracking-widest uppercase text-slate-400 mb-6">Active Shifts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeShifts.map(shift => {
            const emp = employees.find(e => e.id === shift.employeeId);
            return (
              <div key={shift.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-1">{emp?.name}</h3>
                <p className="text-xs font-mono text-slate-500 mb-6 break-all">ID: {shift.id}</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                    onClick={() => logPick(shift.id)}
                  >
                    Log Pick Batch
                  </button>
                  <button 
                    className="w-full py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                    onClick={() => logProblem(shift.employeeId)}
                  >
                    Report Tool Problem
                  </button>
                  <button 
                    className="w-full py-2 bg-white text-slate-500 hover:text-slate-700 rounded-lg text-sm font-medium transition-colors mt-2"
                    onClick={() => endShift(shift.id)}
                  >
                    Clock Out
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
