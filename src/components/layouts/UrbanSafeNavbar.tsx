"use client";

import Link from "next/link";
import { AlertOctagon, Moon, ShieldCheck, Sun, User as UserIcon, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useEmergency } from "@/components/emergency/EmergencyProvider";
import { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Plan Route", href: "/plan-route" },
  { label: "Safety Map", href: "/safety-map" },
  { label: "Emergency", href: "/emergency" },
];

export function UrbanSafeNavbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { openSos } = useEmergency();
  
  const { user, profile, logout } = useAuthContext();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="urban-navbar sticky top-0 z-50">
        <div className="urban-navbar-inner">
          <Link href="/" className="urban-brand" aria-label="UrbanSafe home">
            <span className="urban-brand-icon"><ShieldCheck size={22} /></span>
            <span>UrbanSafe</span>
          </Link>
          <nav className="urban-nav-links" aria-label="Main navigation">
            {navigation.map(item => <Link key={item.label} href={item.href} className={pathname === item.href || (item.label === "Dashboard" && pathname === "/") ? "active" : ""}>{item.label}</Link>)}
          </nav>
          <div className="urban-nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title="Toggle theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="urban-sos" onClick={() => openSos("quick")} aria-label="Open emergency SOS"><AlertOctagon size={17} /><span>SOS</span></button>
            
            {/* Auth Actions */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              {user ? (
                <div className="relative group flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {profile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || <UserIcon size={16} />}
                  </div>
                  <button 
                    onClick={() => logout()}
                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => openAuth("login")}
                    className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => openAuth("signup")}
                    className="px-4 py-1.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-600/20 transition-all"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        defaultMode={authMode} 
      />
    </>
  );
}
