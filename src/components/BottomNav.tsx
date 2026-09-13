export function BottomNav({ currentView, setView }: { currentView: string, setView: (v: 'home' | 'lab' | 'ai7' | 'cancincal') => void }) {
  const items: { name: string, id: 'home' | 'lab' | 'ai7' | 'cancincal' }[] = [
    { name: 'Home', id: 'home' },
    { name: 'Dean Lab', id: 'lab' },
    { name: 'AI7', id: 'ai7' },
    { name: 'Cancincal', id: 'cancincal' }
  ];
  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-2 z-50">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          className={`p-2 text-sm ${currentView === item.id ? 'font-bold text-slate-900' : 'text-slate-500'}`}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
}
