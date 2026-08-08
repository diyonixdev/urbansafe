import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-obsidian-900 text-white selection:bg-neon-cyan selection:text-obsidian-900">
      <Sidebar />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Topbar />
        
        {/* Background ambient effect */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />
        
        <main className="flex-1 overflow-y-auto p-6 z-10">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
