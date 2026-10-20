"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getAdminStats,
  getAdminItems,
  updateAdminItemStatus,
  getAdminOriginalPhotoUrl,
  AdminStats,
  Item,
  ItemStatus,
} from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";
import Modal from "@/components/Modal";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Status Update Modal
  const [updatingItem, setUpdatingItem] = useState<Item | null>(null);
  const [newStatus, setNewStatus] = useState<ItemStatus>("returned");
  const [statusNote, setStatusNote] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Original Unredacted Photo Modal
  const [viewingOriginalItem, setViewingOriginalItem] = useState<Item | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getAdminStats().catch(() => null),
      getAdminItems({
        status: selectedStatus || undefined,
        location_id: selectedLocation || undefined,
      }).catch(() => []),
    ])
      .then(([statsData, itemsData]) => {
        if (statsData) setStats(statsData);
        setItems(itemsData);
      })
      .catch((err) => {
        console.error("Admin load error:", err);
        setError("Failed to load security console data. Verify backend is running.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedLocation]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingItem) return;

    setStatusUpdating(true);
    try {
      await updateAdminItemStatus(updatingItem.id, newStatus, statusNote.trim() || undefined);
      setUpdatingItem(null);
      setStatusNote("");
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update item status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleInspectOriginal = async (item: Item) => {
    setViewingOriginalItem(item);
    setOriginalPhotoUrl(null);
    if (!item.blurred_image_url) {
      return;
    }
    setLoadingOriginal(true);
    try {
      const url = await getAdminOriginalPhotoUrl(item.id);
      setOriginalPhotoUrl(url);
    } catch {
      // Handled gracefully without popping console overlay
    } finally {
      setLoadingOriginal(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      item.location_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Campus Security & Admin Panel</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold uppercase">
              Staff Clearance
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time loss hotspot metrics, item audit trails, dispute resolution, and status management.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors"
        >
          ← Return to Student View
        </Link>
      </div>

      {error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          ⚠️ {error}
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metrics Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Return Rate</span>
                <div className="mt-1 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                  {Math.round(stats.return_rate * 100)}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Items successfully returned</p>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Lost</span>
                <div className="mt-1 text-3xl font-black text-rose-400">
                  {stats.by_status.lost || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Unresolved reports</p>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Found in Storage</span>
                <div className="mt-1 text-3xl font-black text-cyan-400">
                  {stats.by_status.found || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Awaiting claimant verification</p>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Handed Over</span>
                <div className="mt-1 text-3xl font-black text-emerald-400">
                  {stats.by_status.returned || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Closed with QR verification</p>
              </div>
            </div>
          )}

          {/* Two-column layout: Hotspots & Category Distribution */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campus Loss Hotspots */}
              <div className="p-6 rounded-3xl glass-panel space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📍</span> Campus Hotspots (DSCE Blocks)
                </h3>
                <div className="space-y-3">
                  {stats.by_location.length === 0 ? (
                    <p className="text-xs text-slate-500">No hotspot reports recorded yet.</p>
                  ) : (
                    stats.by_location.slice(0, 6).map((loc) => {
                      const total = loc.lost + loc.found;
                      return (
                        <div key={loc.location_id} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center text-slate-300 font-medium">
                            <span className="font-mono text-[11px]">{loc.location_id}</span>
                            <span>
                              <span className="text-rose-400">{loc.lost} lost</span> •{" "}
                              <span className="text-cyan-400">{loc.found} found</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-cyan-500 rounded-full"
                              style={{ width: `${Math.min(100, total * 20)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-6 rounded-3xl glass-panel space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🏷️</span> Category Distribution
                </h3>
                <div className="space-y-3">
                  {stats.by_category.length === 0 ? (
                    <p className="text-xs text-slate-500">No categorized items indexed yet.</p>
                  ) : (
                    stats.by_category.slice(0, 6).map((cat) => (
                      <div key={cat.category} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-300 font-medium">
                          <span className="capitalize font-semibold">{cat.category}</span>
                          <span className="font-mono text-cyan-400">{cat.count} items</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, cat.count * 25)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Master Items Audit Table */}
          {/* ========================================================= */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🛡️</span> All Reported Campus Belongings
                </h3>
                <p className="text-xs text-slate-400">
                  Comprehensive audit log across all Dayananda Sagar departments.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, keyword..."
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-400 w-44"
                />

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                  <option value="matched">Matched</option>
                  <option value="returned">Returned</option>
                </select>

                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-white text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="">All Locations</option>
                  {campusLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs">Loading items from campus security ledger...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No items match the selected security filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="pb-3 pr-4">Item ID / Kind</th>
                      <th className="pb-3 px-4">Description</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4">Location</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredItems.map((item) => {
                      const isLost = item.kind === "lost";
                      return (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 pr-4 font-mono text-[11px]">
                            <span className="text-cyan-300">{item.id.slice(0, 8)}...</span>
                            <span
                              className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isLost
                                  ? "bg-rose-950 text-rose-300"
                                  : "bg-emerald-950 text-emerald-300"
                              }`}
                            >
                              {item.kind}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-200">
                            {item.description || "No description provided"}
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-300">
                            {item.category || "Unclassified"}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {item.location_id}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                                item.status === "returned"
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                  : item.status === "matched"
                                  ? "bg-amber-950 text-amber-300 border-amber-800"
                                  : isLost
                                  ? "bg-rose-950 text-rose-300 border-rose-800"
                                  : "bg-cyan-950 text-cyan-300 border-cyan-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setUpdatingItem(item);
                                setNewStatus(item.status);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                            >
                              Status
                            </button>
                            <button
                              onClick={() => handleInspectOriginal(item)}
                              disabled={!item.blurred_image_url}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                item.blurred_image_url
                                  ? "bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-800/60 cursor-pointer"
                                  : "bg-slate-900/40 text-slate-600 border-white/[0.04] cursor-not-allowed"
                              }`}
                              title={item.blurred_image_url ? "Inspect unredacted photo" : "No photo attached to this report"}
                            >
                              {item.blurred_image_url ? "Original Photo" : "No Photo"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Update Status Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!updatingItem}
        onClose={() => setUpdatingItem(null)}
        title="Update Item Security Status"
        subtitle={`Audit Item ID: ${updatingItem?.id}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Select New Status:
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ItemStatus)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/[0.08] text-white text-xs cursor-pointer focus:outline-none focus:border-cyan-400"
            >
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="matched">Matched</option>
              <option value="returned">Returned (Handed Over)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Audit Note / Handover Reference:
            </label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. In-person handover completed at Security Booth Gate 1."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUpdatingItem(null)}
              className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={statusUpdating}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {statusUpdating ? "Saving..." : "Commit Status Change"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* Inspect Unredacted Original Photo Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!viewingOriginalItem}
        onClose={() => setViewingOriginalItem(null)}
        title="Unredacted Original Photograph (Security Officer Inspection)"
        subtitle="Temporary 60-second signed link from private vault for dispute verification."
        maxWidth="max-w-xl"
      >
        <div className="py-3 space-y-4">
          {loadingOriginal ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Generating temporary signed link from private vault...</p>
            </div>
          ) : originalPhotoUrl ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/[0.1]">
                <Image
                  src={originalPhotoUrl}
                  alt="Original unredacted photograph"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/50">
                🔒 Officer Notice: This original photo is private and must not be shared. Link expires in 60 seconds.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No original photograph was attached to this report.
            </div>
          )}

          <button
            onClick={() => setViewingOriginalItem(null)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close Viewer
          </button>
        </div>
      </Modal>
    </div>
  );
}
