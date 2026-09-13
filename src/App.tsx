/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Simulator } from './ui/Simulator.js';
import { EvidenceViewer } from './ui/EvidenceViewer.js';
import { LabHome } from './ui/LabHome.js';
import { EvaluationLab } from './ui/EvaluationLab.js';

export default function App() {
  const [view, setView] = useState<'lab' | 'simulator' | 'evidence' | 'eval'>('eval');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 pt-3.5 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Check-in Evidence Platform</h1>
        </div>
        <nav className="flex gap-1.5 sm:gap-2 items-center overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button 
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${view === 'eval' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
            onClick={() => setView('eval')}
          >
            AI-7 Eval Lab
          </button>
          <button 
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${view === 'lab' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
            onClick={() => setView('lab')}
          >
            Dean Lab
          </button>
          <button 
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${view === 'evidence' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
            onClick={() => setView('evidence')}
          >
            Canonical Evidence
          </button>
          <button 
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${view === 'simulator' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
            onClick={() => setView('simulator')}
          >
            Raw Simulator
          </button>
        </nav>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {view === 'eval' && <EvaluationLab />}
        {view === 'lab' && <LabHome />}
        {view === 'evidence' && <EvidenceViewer />}
        {view === 'simulator' && <Simulator />}
      </main>
    </div>
  );
}

