"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getHealth()
      .then(() => {
        if (isMounted) setIsBackendHealthy(true);
      })
      .catch(() => {
        if (isMounted) setIsBackendHealthy(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Overview", href: "/" },
    { name: "Report Lost", href: "/lost", badge: "Lost" },
    { name: "Report Found", href: "/found", badge: "Found" },
    { name: "My Belongings", href: "/items" },
    { name: "Security & Admin", href: "/admin" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-lg text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-emerald-300">
                प्रा
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  Prapti-AI
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  DSCE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
                Smart Lost & Found • Dayananda Sagar
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions & Health Pill */}
          <div className="flex items-center gap-3">
            {/* Backend Health Badge */}
            <div
              title={
                isBackendHealthy === null
                  ? "Checking Prapti backend..."
                  : isBackendHealthy
                  ? "Prapti AI API Live (Port 8000)"
                  : "API Offline — Verify backend server"
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.08] text-xs select-none"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendHealthy === null
                    ? "bg-amber-400 animate-pulse"
                    : isBackendHealthy
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                }`}
              />
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                {isBackendHealthy === null ? "Connecting..." : isBackendHealthy ? "AI Online" : "API Offline"}
              </span>
            </div>

            {/* Quick Action Button */}
            <Link
              href="/lost"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <span>+</span> Report Lost
            </Link>

            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 animate-fade-in">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/60"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <Link
              href="/lost"
              className="py-2.5 rounded-xl text-xs font-bold text-center text-white bg-gradient-to-r from-rose-500 to-amber-500"
            >
              Report Lost
            </Link>
            <Link
              href="/found"
              className="py-2.5 rounded-xl text-xs font-bold text-center text-white bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              Report Found
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
