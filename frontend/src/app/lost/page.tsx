"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { reportLostItem, LostItemCreatedResponse, Match } from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";

export default function ReportLostPage() {
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>(campusLocations[1]?.id || "block_2_library");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LostItemCreatedResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !photo) {
      setError("Please provide at least a description or a photo of your lost item.");
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

    try {
      const res = await reportLostItem(formData);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to submit lost report. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-white">Report a Lost Item 🔎</h1>
        <p className="text-slate-400 text-sm mt-1">
          Tell us about what you lost. Our multimodal CLIP engine will instantly compare your report against found items on campus.
        </p>
      </div>

      {result ? (
        <div className="space-y-8 animate-fade-in">
          {/* Submission Success Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">✓</span>
                <h2 className="text-lg font-bold text-white">Lost Report Filed Successfully</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Report ID: <span className="font-mono text-cyan-300">{result.item.id}</span>
              </p>
            </div>
            <Link
              href="/items"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
            >
              Go to My Items
            </Link>
          </div>

          {/* AI Matches Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Instant AI Candidate Matches</h3>
                <p className="text-xs text-slate-400">
                  {result.matches.length > 0
                    ? `Found ${result.matches.length} possible item(s) matching your description and campus zone.`
                    : "No immediate high-confidence matches found. We will notify you when a match is turned in."}
                </p>
              </div>
            </div>

            {result.matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {result.matches.map((m: Match, idx: number) => {
                  const matchPercent = Math.round(m.score * 100);
                  return (
                    <div
                      key={m.found_item.id || idx}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Similarity Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              matchPercent >= 70
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                : "bg-amber-950 text-amber-300 border border-amber-800/60"
                            }`}
                          >
                            {matchPercent}% Match
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {m.found_item.location_id}
                          </span>
                        </div>

                        {/* Image preview */}
                        {m.found_item.blurred_image_url ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 mb-3">
                            <Image
                              src={m.found_item.blurred_image_url}
                              alt="Found item"
                              fill
                              className="object-cover"
                            />
                            <div className="absolute bottom-1 right-1 text-[10px] bg-slate-950/80 px-1.5 py-0.5 rounded text-slate-400">
                              Privacy Blurred
                            </div>
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-slate-600 text-xs mb-3">
                            No Photo
                          </div>
                        )}

                        <p className="text-sm font-semibold text-slate-200 line-clamp-2">
                          {m.found_item.description || "Found item (No description provided)"}
                        </p>

                        {/* Breakdown Bars */}
                        <div className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                          <div className="flex justify-between">
                            <span>Visual & CLIP</span>
                            <span className="font-mono text-cyan-300">
                              {Math.round(m.breakdown.visual * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Text Semantic</span>
                            <span className="font-mono text-indigo-300">
                              {Math.round(m.breakdown.text * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Campus Location</span>
                            <span className="font-mono text-emerald-300">
                              {Math.round(m.breakdown.location * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/items"
                        className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs text-center transition-all block"
                      >
                        Claim This Item →
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                <span className="text-3xl">📡</span>
                <h4 className="text-base font-semibold text-white">Monitoring in the Background</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  We saved your report. As soon as another student reports an item matching your description, Prapti will notify you.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Item Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Be descriptive! e.g. Blue HP laptop charger left in 3rd floor CSE software lab (Block 19), has a small white scratch on the brick."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-sm resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Tip: Include brand, colors, distinct stickers, and room numbers for higher AI match accuracy.
            </p>
          </div>

          {/* Campus Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Last Known Location / Campus Block <span className="text-rose-400">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm"
            >
              {campusLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Photo */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Reference Photo <span className="text-slate-500 text-xs font-normal">(Optional, if you have a photo of it)</span>
            </label>
            <div className="border border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 bg-slate-950/40 text-center">
              {previewUrl ? (
                <div className="relative w-48 h-32 mx-auto rounded-lg overflow-hidden">
                  <Image src={previewUrl} alt="Lost Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 text-xs hover:bg-rose-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline">
                    Attach reference image
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Searching Across Campus Items with CLIP AI...</span>
              </>
            ) : (
              <span>Submit Lost Report & Find Matches</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
