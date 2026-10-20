"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reportLostItem, LostItemCreatedResponse, Item } from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";
import ImageUpload from "@/components/ImageUpload";
import MatchCard from "@/components/MatchCard";

export default function ReportLostPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>(campusLocations[1]?.id || "block_2_library");
  const [timePreset, setTimePreset] = useState<string>("today");
  const [photo, setPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LostItemCreatedResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !photo) {
      setError("Please provide at least a photo or description of what you lost.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("location_id", locationId);
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    if (photo) {
      formData.append("photo", photo);
    }

    // Compute approximate event time based on preset
    const now = new Date();
    if (timePreset === "2hours") {
      now.setHours(now.getHours() - 1.5);
    } else if (timePreset === "today") {
      now.setHours(now.getHours() - 5);
    } else if (timePreset === "yesterday") {
      now.setDate(now.getDate() - 1);
    } else if (timePreset === "older") {
      now.setDate(now.getDate() - 4);
    }
    formData.append("event_time", now.toISOString());

    try {
      const res = await reportLostItem(formData);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to register lost report. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = (foundItem: Item) => {
    // Navigate to /items to answer the challenge
    router.push("/items");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 mb-3 transition-colors"
        >
          ← Return to Overview
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center text-xl font-bold">
            🔎
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Report a Lost Belonging</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Multimodal CLIP neural networks compare your report against found campus items in real-time.
            </p>
          </div>
        </div>
      </div>

      {result ? (
        /* Results Section */
        <div className="space-y-8 animate-fade-in">
          <div className="p-6 rounded-2xl glass-panel border border-emerald-700/50 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <h2 className="text-base font-bold text-white">Lost Report Registered Successfully</h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Report ID: <span className="font-mono text-cyan-300">{result.item.id}</span>
                {result.item.category && <span> • Category: <strong className="text-white">{result.item.category}</strong></span>}
              </p>
            </div>
            <Link
              href="/items"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all text-center"
            >
              Go to My Belongings →
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>⚡</span> AI Multimodal Candidate Matches
                </h3>
                <p className="text-xs text-slate-400">
                  {result.matches.length > 0
                    ? `Found ${result.matches.length} high-confidence campus item(s) matching your description.`
                    : "No matching found items detected above the 50% threshold yet. We will notify you when a match is found."}
                </p>
              </div>
            </div>

            {result.matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.matches.map((m) => (
                  <MatchCard
                    key={m.found_item.id}
                    match={m}
                    onInitiateClaim={handleClaim}
                    actionLabel="Claim & Answer Secret →"
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl glass-panel text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/[0.08] text-slate-400 flex items-center justify-center text-xl mx-auto">
                  ⏳
                </div>
                <h4 className="font-bold text-white text-sm">Active Monitoring Initialized</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your report has been indexed with 512-dimensional CLIP embeddings. Whenever anyone reports a found item anywhere on DSCE campus, it will automatically match against your report.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setResult(null);
                      setDescription("");
                      setPhoto(null);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold"
                  >
                    Report Another Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report Form */
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Detailed Description <span className="text-slate-500 lowercase">(optional if photo provided)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Black wireless earbuds in charging case, lost near parking bays. OnePlus brand with a small scratch on left earbud."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors placeholder:text-slate-600"
            />
            <p className="text-[11px] text-slate-400">
              Tip: Include brand, model, color, or distinctive scratches. CLIP extracts zero-shot features automatically.
            </p>
          </div>

          {/* Optional Photo Upload */}
          <ImageUpload
            onFileSelect={setPhoto}
            label="Reference Photograph (Optional)"
            sublabel="If you have a past photo of your item, upload it here. Face blurring is applied automatically."
          />

          {/* DSCE Location */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Last Seen Campus Location <span className="text-rose-400">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors cursor-pointer"
            >
              {campusLocations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-slate-950 text-white">
                  {loc.name} ({loc.sector})
                </option>
              ))}
            </select>
          </div>

          {/* Approximate Time Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              When Did You Lose It?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "2hours", label: "Last 2 Hours" },
                { id: "today", label: "Earlier Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "older", label: "A Few Days Ago" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setTimePreset(preset.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    timePreset === preset.id
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border border-white/[0.06] hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-xl shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scanning Campus Multimodal Database...</span>
              </>
            ) : (
              <>
                <span>🔎</span>
                <span>Submit Lost Report & Find Matches</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
