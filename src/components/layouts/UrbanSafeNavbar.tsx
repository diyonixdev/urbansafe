"use client";

import Link from "next/link";
import { AlertOctagon, Moon, ShieldCheck, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useEmergency } from "@/components/emergency/EmergencyProvider";

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

  return <header className="urban-navbar sticky top-0 z-50">
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
      </div>
    </div>
  </header>;
}
