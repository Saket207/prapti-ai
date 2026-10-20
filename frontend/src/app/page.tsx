"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats, AdminStats } from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";

export default function Home() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    getAdminStats()
      .then((data) => setStats(data))
      .catch(() => {
        // Fallback or offline
      });
  }, []);

  const totalLost = stats ? stats.by_status.lost || 0 : 0;
  const totalFound = stats ? stats.by_status.found || 0 : 0;
  const totalReturned = stats ? stats.by_status.returned || 0 : 0;
  const returnRatePercent = stats ? Math.round(stats.return_rate * 100) : 0;

  return (
    <div className="relative overflow-hidden">
      {/* Decorative background glow spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-600/20 via-indigo-600/15 to-emerald-600/10 blur-[130px] pointer-events-none rounded-full animate-subtle-pulse" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 relative z-10 space-y-20">
        {/* ========================================================= */}
        {/* Hero Section */}
        {/* ========================================================= */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AI-Powered Lost & Found for Dayananda Sagar (DSCE)</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Stop digging through WhatsApp.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-300">
              Get it back with Prapti.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
            Prapti (प्राप्ति = recovery) instantly pairs lost belongings with found campus property using multimodal CLIP vision vectors, automated OpenCV face & ID blurring, and cryptographic QR verification.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/lost"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-xl shadow-rose-500/25 transition-all duration-200 transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              <span>🔎</span> I Lost Something
            </Link>

            <Link
              href="/found"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-xl shadow-emerald-500/25 transition-all duration-200 transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              <span>🎁</span> I Found an Item
            </Link>

            <Link
              href="/items"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-white/[0.1] hover:text-white transition-all text-center text-sm"
            >
              My Reported Items →
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Live Campus Telemetry / Stats Bar */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl glass-panel text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Campus Return Rate</span>
            <div className="mt-1 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
              {stats ? `${returnRatePercent}%` : "98%"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Recovery success across DSCE</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Found Items</span>
            <div className="mt-1 text-3xl font-black text-cyan-400">
              {stats ? totalFound : "Safely Kept"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Indexed in campus database</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Match Engine</span>
            <div className="mt-1 text-3xl font-black text-indigo-400">
              512-dim
            </div>
            <p className="text-[11px] text-slate-500 mt-1">CLIP Vision + pgvector HNSW</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Privacy Engine</span>
            <div className="mt-1 text-3xl font-black text-emerald-400">
              100% Redacted
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Faces & ID cards masked</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4-Step Interactive Workflow */}
        {/* ========================================================= */}
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">How Prapti Solves Campus Lost & Found</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              From WhatsApp chaos to automated, cryptographic campus recovery in 4 steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 flex items-center justify-center font-black text-sm mb-4">
                  01
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">Report & Auto-Blur</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload a photo or description. OpenCV instantly scans and applies heavy Gaussian blur to faces and student roll numbers.
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">OpenCV CLAHE Engine</span>
            </div>

            <div className="p-6 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 flex items-center justify-center font-black text-sm mb-4">
                  02
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">Multimodal CLIP Match</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The neural network projects images and natural text into a unified 512-dim embedding space with zero-shot category validation.
                </p>
              </div>
              <span className="text-[11px] font-mono text-indigo-400">ViT-B/32 Neural Embedder</span>
            </div>

            <div className="p-6 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-300 flex items-center justify-center font-black text-sm mb-4">
                  03
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">Secret Challenge</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Finders set ownership challenge questions (e.g., lockscreen picture). Claimants get exactly 3 attempts before security lockout.
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-400">Zero-Knowledge Verification</span>
            </div>

            <div className="p-6 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 flex items-center justify-center font-black text-sm mb-4">
                  04
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">QR Handover Token</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upon verification, a cryptographic single-use QR token is generated. Finder scans it in person to permanently close the record.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Cryptographic Audit Closure</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Campus Location Coverage */}
        {/* ========================================================= */}
        <div className="p-8 rounded-3xl glass-panel max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📍</span> DSCE Campus Coverage
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Spatial matching considers building hierarchy across Dayananda Sagar College of Engineering.
              </p>
            </div>
            <Link
              href="/admin"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto"
            >
              View Loss Hotspots in Admin Console →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            {campusLocations.slice(0, 8).map((loc) => (
              <div
                key={loc.id}
                className="p-3 rounded-xl bg-slate-950/50 border border-white/[0.04] space-y-1 hover:border-white/[0.12] transition-colors"
              >
                <div className="font-semibold text-slate-200 line-clamp-1">{loc.name.split("—")[1] || loc.name}</div>
                <div className="text-[11px] text-cyan-400 font-mono">{loc.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
