import React from 'react';

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian-900 text-white selection:bg-neon-cyan selection:text-obsidian-900 flex flex-col relative overflow-hidden">
      {/* Landing page specific ambient backgrounds */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none" />
      
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center glow-cyan">
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
          </div>
          <span className="font-bold tracking-widest uppercase text-sm">Urban AI</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#technology" className="hover:text-white transition-colors">Technology</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </nav>
        
        <div>
          <button className="px-5 py-2 text-sm font-medium glass-panel hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
            Enter System
          </button>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col">
        {children}
      </main>
      
      <footer className="py-8 border-t border-white/5 text-center text-xs text-gray-500 relative z-20">
        <p>&copy; {new Date().getFullYear()} AI Urban Safety Intelligence Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
