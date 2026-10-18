"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { reportFoundItem, Item } from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";

export default function ReportFoundPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string>(campusLocations[0]?.id || "block_2_library");
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<Item | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError("Please select or capture a photograph of the found item.");
      return;
    }
    if (!secretQuestion.trim() || !secretAnswer.trim()) {
      setError("Secret question and answer are required to protect ownership.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("location_id", locationId);
    formData.append("secret_question", secretQuestion.trim());
    formData.append("secret_answer", secretAnswer.trim());
    if (description.trim()) {
      formData.append("description", description.trim());
    }

    try {
      const result = await reportFoundItem(formData);
      setCreatedItem(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to submit found report. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-white">Report a Found Item 🎁</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a photo of the item you found on DSCE campus. Faces and student IDs are automatically blurred by AI.
        </p>
      </div>

      {createdItem ? (
        <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 backdrop-blur-md space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Found Report Registered!</h2>
            <p className="text-sm text-slate-300 mt-1">
              Item successfully indexed. Our CLIP AI pipeline is now comparing it against active lost reports.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-semibold">Item ID</span>
              <span className="text-xs font-mono text-cyan-300">{createdItem.id}</span>
            </div>
            {createdItem.category && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-semibold">AI Tagged Category</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {createdItem.category} {createdItem.color ? `(${createdItem.color})` : ""}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-semibold">Location</span>
              <span className="text-xs text-slate-200">{createdItem.location_id}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setCreatedItem(null);
                setPhoto(null);
                setPreviewUrl(null);
                setSecretQuestion("");
                setSecretAnswer("");
                setDescription("");
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-all"
            >
              Report Another Item
            </button>
            <Link
              href="/items"
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all"
            >
              View My Reported Items
            </Link>
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

          {/* Photo Upload Zone */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Photograph of Item <span className="text-rose-400">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-950/40 relative">
              {previewUrl ? (
                <div className="relative w-full max-w-xs mx-auto aspect-video rounded-xl overflow-hidden shadow-md">
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 text-xs hover:bg-rose-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="text-4xl mb-2">📷</div>
                  <span className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
                    Click to upload
                  </span>{" "}
                  <span className="text-sm text-slate-400">or take a photo</span>
                  <p className="text-xs text-slate-500 mt-1">JPEG, PNG, or WebP up to 5 MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Location Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Campus Location <span className="text-rose-400">*</span>
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

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Description <span className="text-slate-500 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Black leather wallet found near staircase, contains college ID card and keys"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-sm resize-none"
            />
          </div>

          {/* Anti-Theft Secret Question & Answer */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span>🔐</span>
              <span>Anti-Theft Verification Challenge</span>
            </div>
            <p className="text-xs text-slate-400">
              Set a question that only the true owner would know. Claimants will be prompted to answer this before retrieving the item.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secret Question <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={secretQuestion}
                onChange={(e) => setSecretQuestion(e.target.value)}
                placeholder="e.g. What sticker or keychain is attached to this?"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secret Answer <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                placeholder="e.g. Batman logo"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Kept strictly confidential in locked backend storage. Never exposed to students.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Running AI Privacy Blur & Ingesting...</span>
              </>
            ) : (
              <span>Submit Found Report</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
