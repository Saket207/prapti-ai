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

export default function MyItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found">("all");

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

  // QR Handover scan state
  const [scanQrInput, setScanQrInput] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

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
        setVerificationError("Incorrect answer. Please verify and try again.");
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

  const handleConfirmQrHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQrInput.trim()) return;

    try {
      await confirmHandover(scanQrInput.trim());
      setHandoverSuccess("Handover verified! Item marked as Returned.");
      setScanQrInput("");
      fetchItems();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const filteredItems = items.filter((it) => {
    if (activeTab === "all") return true;
    return it.kind === activeTab;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Reported Belongings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track claims, check AI match scores, and generate handover QR codes.
          </p>
        </div>

        {/* Handover scan trigger */}
        <form onSubmit={handleConfirmQrHandover} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter or scan QR token"
            value={scanQrInput}
            onChange={(e) => setScanQrInput(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
          >
            Confirm QR
          </button>
        </form>
      </div>

      {handoverSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
          <span>✓ {handoverSuccess}</span>
          <button onClick={() => setHandoverSuccess(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
        {(["all", "lost", "found"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab} ({tab === "all" ? items.length : items.filter((i) => i.kind === tab).length})
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching student reports from campus database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <span className="text-4xl">📂</span>
          <h3 className="text-lg font-bold text-white">No items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven&apos;t reported any lost or found belongings yet.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/lost"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
            >
              Report Lost Item
            </Link>
            <Link
              href="/found"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
            >
              Report Found Item
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isLost = item.kind === "lost";
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
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
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === "returned"
                          ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                          : item.status === "matched"
                          ? "bg-amber-900/50 text-amber-300 border border-amber-700/50"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      ● {item.status}
                    </span>
                  </div>

                  {item.blurred_image_url ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 mb-3">
                      <Image src={item.blurred_image_url} alt="Item photo" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-slate-600 text-xs mb-3">
                      No Photo Provided
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-100 line-clamp-2">
                    {item.description || "No description"}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="text-slate-300 font-mono text-[11px]">{item.location_id}</span>
                    </div>
                    {item.category && (
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <span className="text-cyan-300">{item.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isLost && (
                  <button
                    onClick={() => handleViewMatches(item)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
      {/* Matches Drawer / Modal */}
      {/* ========================================================= */}
      {selectedLostItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">AI Multimodal Matches</h3>
                <p className="text-xs text-slate-400">
                  Target: {selectedLostItem.description || selectedLostItem.location_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLostItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {loadingMatches ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Running 512-dim CLIP vector calculations...
              </div>
            ) : matches.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No active found items currently match this report with score &ge; 40%.
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {Math.round(m.score * 100)}% Match
                        </span>
                        <span className="text-xs text-slate-400">{m.found_item.location_id}</span>
                      </div>
                      <p className="text-sm text-white font-medium line-clamp-1">
                        {m.found_item.description || "Found item"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Visual: {Math.round(m.breakdown.visual * 100)}% | Text: {Math.round(m.breakdown.text * 100)}% | Location: {Math.round(m.breakdown.location * 100)}%
                      </p>
                    </div>

                    <button
                      onClick={() => handleStartClaim(m.found_item)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all whitespace-nowrap cursor-pointer"
                    >
                      Answer Secret Challenge →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Secret Challenge Verification Modal */}
      {/* ========================================================= */}
      {claimingFoundItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔐</span> Ownership Verification
              </h3>
              <button
                onClick={() => setClaimingFoundItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {verifiedToken ? (
              <div className="p-6 rounded-xl bg-emerald-950/80 border border-emerald-800 text-center space-y-4">
                <div className="text-3xl">🎉</div>
                <h4 className="text-lg font-bold text-emerald-300">Ownership Verified!</h4>
                <p className="text-xs text-slate-300">
                  Present this QR token to the finder or security desk to claim your item:
                </p>
                <div className="p-3 bg-white text-slate-950 font-mono font-bold text-xs rounded-lg select-all break-all shadow-inner">
                  {verifiedToken}
                </div>
                <p className="text-[11px] text-slate-400">
                  Item status has been set to <strong>matched</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifyAnswer} className="space-y-4">
                <p className="text-xs text-slate-400">
                  The person who found this item set a secret question. Answer it correctly to prove this item is yours.
                </p>

                {verificationError && (
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                    {verificationError}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[11px] uppercase font-semibold text-cyan-400 block mb-1">
                    Question:
                  </span>
                  <p className="text-sm font-medium text-white">{secretQuestion || "Loading question..."}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Answer
                  </label>
                  <input
                    type="text"
                    value={claimAnswer}
                    onChange={(e) => setClaimAnswer(e.target.value)}
                    placeholder="Enter the secret detail..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                    required
                  />
                  {attemptsLeft !== null && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      ⚠️ Attempts remaining: {attemptsLeft} (locked at 0)
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifying ? "Verifying..." : "Verify Ownership"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
