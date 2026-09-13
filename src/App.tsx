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
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:pb-4">Check-in Evidence Platform</h1>
        <div className="flex gap-4 sm:gap-6 items-end overflow-x-auto w-full sm:w-auto">
          <button 
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${view === 'eval' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setView('eval')}
          >
            AI-7 Evaluation Lab
          </button>
          <button 
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${view === 'lab' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setView('lab')}
          >
            Dean Lab
          </button>
          <button 
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${view === 'evidence' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setView('evidence')}
          >
            Canonical Evidence
          </button>
          <button 
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${view === 'simulator' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setView('simulator')}
          >
            Raw Simulator
          </button>
        </div>
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

