import React, { useEffect, useState } from 'react';
import { EmployeeJourney } from './EmployeeJourney.js';
import { FlaskConical, Database, Activity, ArrowRight } from 'lucide-react';

interface EmployeeWithProgress {
  id: string;
  name: string;
  role: string;
  populatedDays: number;
  latestDay: number | null;
}

interface LabHomeProps {
  onNavigate?: (view: 'eval' | 'evidence' | 'simulator' | 'lab') => void;
}

export function LabHome({ onNavigate }: LabHomeProps) {
  const [employees, setEmployees] = useState<EmployeeWithProgress[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeWithProgress | null>(null);

  const fetchEmployees = async () => {
    const res = await fetch('/api/internal/lab/employees');
    const data = await res.json();
    setEmployees(data.filter((e: any) => e.role !== 'Supervisor')); // Only show actual test employees
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (selectedEmp) {
    return <EmployeeJourney employee={selectedEmp} onBack={() => { setSelectedEmp(null); fetchEmployees(); }} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-2 tracking-tight">DEAN LAB</h1>
        <p className="text-slate-500 text-base sm:text-lg">Longitudinal Evidence & AI Evaluation Platform</p>
      </header>

      {/* Module Launcher Icons Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform Modules</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            onClick={() => onNavigate?.('simulator')}
            className="group border border-slate-200 rounded-2xl p-5 bg-white shadow-xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full group-hover:bg-slate-200 transition-colors">Simulator</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Raw Simulator</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Trigger raw organizational events, shifts, task logs, and causal scenarios.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Launch Simulator</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Employee Journeys Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Journeys</h2>
          <span className="text-xs font-medium text-slate-400">4 Active Subjects</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {employees.map(emp => (
            <div 
              key={emp.id} 
              className="border border-slate-200 rounded-2xl p-6 bg-white shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => setSelectedEmp(emp)}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{emp.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{emp.role}</p>
                  </div>
                  <span className="text-xs font-mono font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-md">
                    {emp.id}
                  </span>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="text-sm text-slate-600 flex justify-between">
                    <span className="font-medium text-slate-700">Journey Status:</span>
                    <span>{emp.latestDay !== null ? `Day ${emp.latestDay}` : 'Not started'}</span>
                  </div>
                  <div className="text-sm text-slate-600 flex justify-between">
                    <span className="font-medium text-slate-700">Populated Days:</span>
                    <span>{emp.populatedDays} / 11</span>
                  </div>
                </div>
              </div>

              <button className="w-full min-h-[44px] py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center shadow-xs active:scale-[0.98]">
                Open Journey
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
