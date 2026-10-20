"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { reportFoundItem, Item } from "@/lib/api";
import campusLocations from "@/data/campus_locations.json";
import ImageUpload from "@/components/ImageUpload";

export default function ReportFoundPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [locationId, setLocationId] = useState<string>(campusLocations[0]?.id || "block_2_library");
  const [description, setDescription] = useState("");
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<Item | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError("Please capture or select a photo of the item you found.");
      return;
    }
    if (!secretQuestion.trim() || !secretAnswer.trim()) {
      setError("Secret verification question and answer are required to prevent fraudulent claims.");
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
        setError("Failed to register found item. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 mb-3 transition-colors"
        >
          ← Return to Overview
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center text-xl font-bold">
            🎁
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Report a Found Item</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Securely index property found on DSCE campus. Faces & ID credentials are automatically blurred by OpenCV.
            </p>
          </div>
        </div>
      </div>

      {createdItem ? (
        /* Success Card */
        <div className="p-8 rounded-3xl glass-panel border border-emerald-700/60 bg-emerald-950/20 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Found Item Successfully Indexed!</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
              Our neural network has analyzed the photograph, extracted multimodal embeddings, and automatically blurred sensitive regions.
            </p>
          </div>

          <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] text-left space-y-3">
            {createdItem.blurred_image_url && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/[0.08] mb-3">
                <Image
                  src={createdItem.blurred_image_url}
                  alt="Redacted public thumbnail"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/[0.1] text-[10px] font-mono text-cyan-300">
                  🔒 Public Redacted View
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase font-semibold">Item ID:</span>
              <span className="font-mono text-cyan-300 text-[11px]">{createdItem.id}</span>
            </div>

            {createdItem.category && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 uppercase font-semibold">AI Classified Category:</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {createdItem.category} {createdItem.color ? `• ${createdItem.color}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase font-semibold">Campus Location:</span>
              <span className="font-mono text-slate-300">{createdItem.location_id}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/items"
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all"
            >
              Go to My Belongings →
            </Link>
            <button
              onClick={() => {
                setCreatedItem(null);
                setPhoto(null);
                setDescription("");
                setSecretQuestion("");
                setSecretAnswer("");
              }}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-white/[0.08] transition-all"
            >
              Report Another Item
            </button>
          </div>
        </div>
      ) : (
        /* Found Item Form */
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Section 1: Item Photograph */}
          <div className="space-y-4">
            <ImageUpload
              onFileSelect={setPhoto}
              required
              label="1. Photograph of Found Item"
              sublabel="Capture or upload the found item. If student faces or college ID cards appear, OpenCV automatically redacts them."
            />
          </div>

          {/* Section 2: Campus Location */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              2. Where on DSCE Campus Was It Found? <span className="text-rose-400">*</span>
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

          {/* Section 3: Description */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              3. Visual Description <span className="text-slate-500 lowercase">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Found on 2nd floor library reading table. Black OnePlus earphone case with charging cord."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors placeholder:text-slate-600"
            />
          </div>

          {/* Section 4: Secret Verification Challenge */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-amber-900/40 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">🔐</span>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  4. Ownership Secret Challenge Question
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Set a question that only the genuine owner can answer. Prevents wrongful claims across campus.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Secret Challenge Question <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={secretQuestion}
                  onChange={(e) => setSecretQuestion(e.target.value)}
                  placeholder="e.g. What is the lockscreen wallpaper? / What sticker is on the back?"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Correct Answer <span className="text-rose-400">*</span>{" "}
                  <span className="text-slate-500 lowercase">(never shown publicly)</span>
                </label>
                <input
                  type="text"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  placeholder="e.g. Iron Man / Yellow Smiley Sticker / Red keychain"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Matching is case-insensitive. Claimants receive 3 attempts before their account is locked.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Blurring Faces & Computing CLIP Multimodal Vectors...</span>
              </>
            ) : (
              <>
                <span>🎁</span>
                <span>Register Found Item & Activate Matching</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
