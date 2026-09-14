import { Home, FlaskConical, Sparkles, Database } from 'lucide-react';

export function BottomNav({ 
  currentView, 
  setView 
}: { 
  currentView: string; 
  setView: (v: 'home' | 'lab' | 'ai7' | 'cancincal') => void; 
}) {
  const items: { name: string; id: 'home' | 'lab' | 'ai7' | 'cancincal'; icon: typeof Home }[] = [
    { name: 'Home', id: 'home', icon: Home },
    { name: 'Dean Lab', id: 'lab', icon: FlaskConical },
    { name: 'AI7 Lab', id: 'ai7', icon: Sparkles },
    { name: 'Canonical', id: 'cancincal', icon: Database },
  ];

  return (
    <div className="fixed bottom-5 left-0 right-0 flex justify-center items-center pointer-events-none z-50 px-4">
      <nav 
        id="floating-bottom-nav"
        className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 rounded-full p-1.5 flex items-center gap-1 sm:gap-2 transition-all duration-200 ring-1 ring-black/5"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap">{item.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

