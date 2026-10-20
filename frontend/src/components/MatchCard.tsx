"use client";

import Image from "next/image";
import { Match, Item } from "@/lib/api";

interface MatchCardProps {
  match: Match;
  onInitiateClaim?: (item: Item) => void;
  actionLabel?: string;
}

export default function MatchCard({
  match,
  onInitiateClaim,
  actionLabel = "Answer Secret Challenge →",
}: MatchCardProps) {
  const { found_item, score, breakdown } = match;
  const scorePercent = Math.round(score * 100);

  // Score color styling
  const scoreBadgeColor =
    scorePercent >= 75
      ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-emerald-500/20"
      : scorePercent >= 60
      ? "bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-cyan-500/20"
      : "bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-amber-500/20";

  return (
    <div className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full border shadow-sm ${scoreBadgeColor}`}
            >
              {scorePercent}% Match
            </span>
            {found_item.category && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-white/[0.08]">
                {found_item.category} {found_item.color ? `• ${found_item.color}` : ""}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-white/[0.06]">
            {found_item.location_id}
          </span>
        </div>

        {/* Thumbnail Image if present */}
        {found_item.blurred_image_url && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 mb-3 border border-white/[0.08]">
            <Image
              src={found_item.blurred_image_url}
              alt="Item photo"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Description */}
        <p className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
          {found_item.description || "Found campus property"}
        </p>

        {/* 4-Factor Multimodal Breakdown Meters */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Multimodal AI Breakdown
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-950/50 border border-white/[0.04]">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Visual Match</span>
                <span className="font-mono text-cyan-300">{Math.round(breakdown.visual * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(breakdown.visual * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/50 border border-white/[0.04]">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Text Semantics</span>
                <span className="font-mono text-indigo-300">{Math.round(breakdown.text * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(breakdown.text * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/50 border border-white/[0.04]">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Campus Location</span>
                <span className="font-mono text-emerald-300">{Math.round(breakdown.location * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(breakdown.location * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/50 border border-white/[0.04]">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Time Proximity</span>
                <span className="font-mono text-amber-300">{Math.round(breakdown.time * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(breakdown.time * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onInitiateClaim && (
        <button
          onClick={() => onInitiateClaim(found_item)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
