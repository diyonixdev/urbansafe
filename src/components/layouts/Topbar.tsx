import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { Input } from '../ui/Input';

export function Topbar() {
  return (
    <header className="h-16 border-b border-white/10 glass-panel-dark sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white transition-colors lg:hidden">
          <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
          <span>HQ</span>
          <span className="mx-2">/</span>
          <span className="text-white">Live Monitoring</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-64 hidden sm:block">
          <Input 
            placeholder="Query intelligence..." 
            icon={<Search size={16} />}
            className="bg-obsidian-900 border-none h-9 text-xs"
          />
        </div>
        
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-neon-red rounded-full shadow-[0_0_5px_#ff003c]"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-blue to-neon-cyan p-[1px]">
          <div className="w-full h-full rounded-full bg-obsidian-900 flex items-center justify-center">
            <span className="text-xs font-bold text-white">OP</span>
          </div>
        </div>
      </div>
    </header>
  );
}
