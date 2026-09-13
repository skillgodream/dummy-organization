import React, { useEffect, useState } from 'react';
import { EmployeeJourney } from './EmployeeJourney.js';

interface EmployeeWithProgress {
  id: string;
  name: string;
  role: string;
  populatedDays: number;
  latestDay: number | null;
}

export function LabHome() {
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-10 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-2 tracking-tight">DEAN LAB</h1>
        <p className="text-slate-500 text-base sm:text-lg">Longitudinal Evidence Testing Laboratory</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {employees.map(emp => (
          <div 
            key={emp.id} 
            className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
            onClick={() => setSelectedEmp(emp)}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{emp.name}</h2>
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

            <button className="w-full py-3 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              Open Journey
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
