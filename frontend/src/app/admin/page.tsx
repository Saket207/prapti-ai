"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats, AdminStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then((data) => setStats(data))
      .catch((err) => {
        console.error("Error loading admin stats:", err);
        setError("Failed to load campus statistics. Ensure backend is running.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white">Campus Security & Admin Panel</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold uppercase">
              Staff Only
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time loss hotspot metrics, recovery rates, and category distribution for DSCE.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
        >
          ← Return to Student View
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Calculating campus metrics from Supabase database...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
          ⚠️ {error}
        </div>
      ) : stats ? (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Return Rate</span>
              <div className="mt-2 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                {Math.round(stats.return_rate * 100)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Items successfully returned</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Lost</span>
              <div className="mt-2 text-3xl font-black text-rose-400">
                {stats.by_status.lost || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Unresolved reports</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Found Items</span>
              <div className="mt-2 text-3xl font-black text-cyan-400">
                {stats.by_status.found || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Safely in storage</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Handed Over</span>
              <div className="mt-2 text-3xl font-black text-emerald-400">
                {stats.by_status.returned || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Closed with QR verification</p>
            </div>
          </div>

          {/* Two-column layout: Hotspots & Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campus Loss Hotspots */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📍</span> Campus Hotspots (DSCE Blocks)
              </h3>
              <p className="text-xs text-slate-400">
                Identifies locations where the highest concentration of lost belongings are reported.
              </p>

              {stats.by_location.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No location reports yet.</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {stats.by_location.slice(0, 7).map((loc, idx) => {
                    const total = loc.lost + loc.found;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-200">{loc.location_id}</span>
                          <span className="font-mono text-cyan-400">{total} incidents ({loc.lost} lost, {loc.found} found)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, total * 20)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Distribution */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📦</span> Lost Category Frequency
              </h3>
              <p className="text-xs text-slate-400">
                Item classes automatically tagged by our CLIP AI zero-shot classifier.
              </p>

              {stats.by_category.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No categorized items yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {stats.by_category.map((cat, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 capitalize">{cat.category}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400">
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
