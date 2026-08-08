import React from 'react';
import { Activity, ShieldAlert, Map, Database, Settings } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { icon: <Activity size={20} />, label: 'Dashboard', active: true },
    { icon: <ShieldAlert size={20} />, label: 'Threats', active: false },
    { icon: <Map size={20} />, label: 'Map View', active: false },
    { icon: <Database size={20} />, label: 'Data Hub', active: false },
    { icon: <Settings size={20} />, label: 'System', active: false },
  ];

  return (
    <aside className="w-64 h-screen border-r border-white/10 glass-panel-dark flex flex-col py-6">
      {/* Logo Area */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center glow-cyan">
          <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
        </div>
        <span className="text-white font-bold tracking-widest uppercase text-sm">Urban AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item, index) => (
          <button
            key={index}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              item.active 
                ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* User / Status Area */}
      <div className="px-6 mt-auto">
        <div className="p-4 rounded-xl bg-obsidian-800 border border-white/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <div className="text-xs">
            <p className="text-white font-medium text-[10px] uppercase tracking-wider">System Status</p>
            <p className="text-neon-green">Optimal</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
