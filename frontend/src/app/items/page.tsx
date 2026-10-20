"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getMyItems,
  getMatchesForLostItem,
  initiateClaim,
  verifyClaimAnswer,
  confirmHandover,
  Item,
  Match,
} from "@/lib/api";
import Modal from "@/components/Modal";
import MatchCard from "@/components/MatchCard";

export default function MyItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found" | "matched" | "returned">("all");

  // Matches modal state
  const [selectedLostItem, setSelectedLostItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Claim & Verification modal state
  const [claimingFoundItem, setClaimingFoundItem] = useState<Item | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [secretQuestion, setSecretQuestion] = useState<string | null>(null);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // In-person Handover confirmation state
  const [scanQrInput, setScanQrInput] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [confirmingHandover, setConfirmingHandover] = useState(false);

  const fetchItems = () => {
    setLoading(true);
    getMyItems()
      .then((data) => setItems(data))
      .catch((err) => console.error("Error fetching items:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleViewMatches = async (item: Item) => {
    setSelectedLostItem(item);
    setLoadingMatches(true);
    setMatches([]);
    try {
      const matchData = await getMatchesForLostItem(item.id);
      setMatches(matchData);
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleStartClaim = async (foundItem: Item) => {
    if (!selectedLostItem) return;
    setClaimingFoundItem(foundItem);
    setVerificationError(null);
    setVerifiedToken(null);
    setClaimAnswer("");

    try {
      const claimRes = await initiateClaim(selectedLostItem.id, foundItem.id);
      setClaimId(claimRes.claim_id);
      setSecretQuestion(claimRes.question);
      setAttemptsLeft(claimRes.attempts_left);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setVerificationError(err.message);
      } else {
        setVerificationError("Failed to initiate claim.");
      }
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimId || !claimAnswer.trim()) return;

    setVerifying(true);
    setVerificationError(null);

    try {
      const verifyRes = await verifyClaimAnswer(claimId, claimAnswer.trim());
      if (verifyRes.verified && verifyRes.qr_token) {
        setVerifiedToken(verifyRes.qr_token);
        fetchItems(); // Refresh status in background
      } else {
        setAttemptsLeft(verifyRes.attempts_left ?? null);
        setVerificationError(
          `Incorrect answer. ${verifyRes.attempts_left ?? 0} attempt(s) remaining before security lockout.`
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setVerificationError(err.message);
      } else {
        setVerificationError("Verification request failed.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQrInput.trim()) return;

    setConfirmingHandover(true);
    setHandoverError(null);
    setHandoverSuccess(null);

    try {
      const res = await confirmHandover(scanQrInput.trim());
      setHandoverSuccess(`Handover confirmed! Status permanently updated to: ${res.status}`);
      setScanQrInput("");
      fetchItems();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setHandoverError(err.message);
      } else {
        setHandoverError("Invalid or expired QR token.");
      }
    } finally {
      setConfirmingHandover(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "lost" || activeTab === "found") return item.kind === activeTab;
    return item.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">My Reported Belongings</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
              Student Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track active lost reports, manage found items, inspect AI multimodal matches, and verify ownership handovers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/lost"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition-all"
          >
            + Report Lost
          </Link>
          <Link
            href="/found"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-md shadow-emerald-500/20 transition-all"
          >
            + Report Found
          </Link>
        </div>
      </div>

      {/* In-Person Handover Confirmation Banner */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">📲</span>
            <div>
              <h3 className="text-sm font-bold text-white">Finder Handover Confirmation</h3>
              <p className="text-[11px] text-slate-400">
                Found an item? When the owner meets you and presents their QR verification token, paste it here to mark the item as returned.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmHandover} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            value={scanQrInput}
            onChange={(e) => setScanQrInput(e.target.value)}
            placeholder="Paste verified single-use QR token (e.g. prpt_a8f9c2...)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={confirmingHandover || !scanQrInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all whitespace-nowrap cursor-pointer"
          >
            {confirmingHandover ? "Confirming..." : "Confirm In-Person Return"}
          </button>
        </form>

        {handoverSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
            <span>✓ {handoverSuccess}</span>
            <button onClick={() => setHandoverSuccess(null)} className="text-[11px] text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {handoverError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {handoverError}</span>
            <button onClick={() => setHandoverError(null)} className="text-[11px] text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-3 overflow-x-auto">
        {(
          [
            { id: "all", label: "All Items", count: items.length },
            { id: "lost", label: "Lost Reports", count: items.filter((i) => i.kind === "lost").length },
            { id: "found", label: "Found Belongings", count: items.filter((i) => i.kind === "found").length },
            { id: "matched", label: "Claimed & Matched", count: items.filter((i) => i.status === "matched").length },
            { id: "returned", label: "Resolved / Returned", count: items.filter((i) => i.status === "returned").length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_-3px_rgba(6,182,212,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
            }`}
          >
            {tab.label} <span className="font-mono text-[11px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Fetching campus belongings from database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center rounded-3xl glass-panel space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/[0.08] text-slate-400 flex items-center justify-center text-3xl mx-auto">
            📂
          </div>
          <h3 className="text-lg font-bold text-white">No items found in this tab</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Report a lost item or found property across Dayananda Sagar College of Engineering to see it listed here.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/lost"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
            >
              Report Lost Item
            </Link>
            <Link
              href="/found"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
            >
              Report Found Item
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isLost = item.kind === "lost";
            const statusColor =
              item.status === "returned"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                : item.status === "matched"
                ? "bg-amber-950/80 text-amber-300 border-amber-800"
                : isLost
                ? "bg-rose-950/80 text-rose-300 border-rose-800"
                : "bg-cyan-950/80 text-cyan-300 border-cyan-800";

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isLost
                          ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      }`}
                    >
                      {item.kind}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${statusColor}`}
                    >
                      ● {item.status}
                    </span>
                  </div>

                  {/* Blurred Photo Thumbnail */}
                  {item.blurred_image_url ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 mb-3 border border-white/[0.08] group">
                      <Image
                        src={item.blurred_image_url}
                        alt="Belonging photo"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-2xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-center text-slate-500 text-xs mb-3">
                      No Photo Provided
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
                    {item.description || "Campus belonging"}
                  </p>

                  {/* Meta Details */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Campus Location:</span>
                      <span className="text-slate-200 font-mono text-[11px] bg-slate-950/60 px-2 py-0.5 rounded">
                        {item.location_id}
                      </span>
                    </div>
                    {item.category && (
                      <div className="flex justify-between items-center">
                        <span>Category:</span>
                        <span className="font-semibold text-cyan-300">
                          {item.category} {item.color ? `(${item.color})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                {isLost && item.status !== "returned" && (
                  <button
                    onClick={() => handleViewMatches(item)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡</span> Check AI Matches
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* AI Multimodal Matches Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!selectedLostItem}
        onClose={() => setSelectedLostItem(null)}
        title="AI Multimodal Matches"
        subtitle={`Target Lost Report: "${selectedLostItem?.description || "Lost Item"}"`}
        maxWidth="max-w-3xl"
      >
        {loadingMatches ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Running multimodal vector scoring across campus items...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <span className="text-3xl">🔍</span>
            <h4 className="font-bold text-white text-base">No high-confidence matches found yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Our AI engine only alerts you when composite similarity exceeds 50%. You will be notified when a matching item is reported.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Found {matches.length} matching candidate item(s) ranked by CLIP visual & semantic proximity:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <MatchCard
                  key={m.found_item.id}
                  match={m}
                  onInitiateClaim={handleStartClaim}
                  actionLabel="Answer Secret Challenge →"
                />
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* Ownership Secret Challenge Claim Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!claimingFoundItem}
        onClose={() => setClaimingFoundItem(null)}
        title="Ownership Verification Challenge"
        subtitle="Prove you are the rightful owner by answering the finder's secret challenge."
        maxWidth="max-w-lg"
      >
        {verifiedToken ? (
          /* Verification Success & QR Token */
          <div className="text-center space-y-5 py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/40">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Ownership Verified!</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Present this single-use cryptographic QR token to the finder during your campus handover.
              </p>
            </div>

            {/* Cryptographic QR Token Display Card */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 space-y-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                Cryptographic Handover Token
              </span>
              <div className="font-mono text-sm sm:text-base font-black text-white tracking-widest bg-slate-900 p-3 rounded-xl border border-white/[0.08] select-all break-all">
                {verifiedToken}
              </div>
              <p className="text-[11px] text-slate-500">
                Single-use token • Verified by backend cryptographic signature
              </p>
            </div>

            <button
              onClick={() => {
                setClaimingFoundItem(null);
                setSelectedLostItem(null);
                fetchItems();
              }}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Done & Return to My Belongings
            </button>
          </div>
        ) : (
          /* Secret Question Form */
          <form onSubmit={handleVerifyAnswer} className="space-y-5 py-2">
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Finder&apos;s Challenge Question:
              </span>
              <p className="text-sm font-semibold text-white">
                {secretQuestion || "Loading question..."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Your Answer:
              </label>
              <input
                type="text"
                value={claimAnswer}
                onChange={(e) => setClaimAnswer(e.target.value)}
                placeholder="Type your answer (case-insensitive)"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Attempts Remaining:{" "}
                  <strong className={attemptsLeft === 1 ? "text-rose-400" : "text-amber-300"}>
                    {attemptsLeft ?? 3}
                  </strong>
                </span>
                <span>Lockout after 3 failed attempts</span>
              </div>
            </div>

            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                ⚠️ {verificationError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClaimingFoundItem(null)}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || !claimAnswer.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
              >
                {verifying ? "Verifying..." : "Submit Answer & Get QR Token"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
