/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Simulator } from './ui/Simulator.js';
import { EvidenceViewer } from './ui/EvidenceViewer.js';
import { LabHome } from './ui/LabHome.js';
import { EvaluationLab } from './ui/EvaluationLab.js';
import { BottomNav } from './components/BottomNav.js';
import { Home } from './pages/Home.js';

export default function App() {
  const [view, setView] = useState<'home' | 'lab' | 'simulator' | 'ai7' | 'cancincal'>('home');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">SkillGo Club</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {view === 'home' && <Home />}
        {view === 'lab' && <LabHome onNavigate={(v) => {
          if (v === 'eval') setView('ai7');
          else if (v === 'evidence') setView('cancincal');
          else if (v === 'simulator') setView('simulator');
          else setView('lab');
        }} />}
        {view === 'simulator' && <Simulator />}
        {view === 'ai7' && <EvaluationLab />}
        {view === 'cancincal' && <EvidenceViewer />}
      </main>
      
      <BottomNav currentView={view} setView={setView} />
    </div>
  );
}

