"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Image from "next/image";

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  label?: string;
  sublabel?: string;
}

export default function ImageUpload({
  onFileSelect,
  required = false,
  label = "Item Photograph",
  sublabel = "JPEG, PNG, or WebP up to 5 MB. Faces & roll numbers are automatically blurred.",
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo exceeds the 5 MB maximum limit.");
      return;
    }

    const sizeKb = (file.size / 1024).toFixed(0);
    const sizeStr = Number(sizeKb) > 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKb} KB`;

    setFileMeta({ name: file.name, size: sizeStr });
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileSelect(file);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileMeta(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileSelect(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {fileMeta && (
          <span className="text-[11px] font-mono text-cyan-400">
            {fileMeta.name} ({fileMeta.size})
          </span>
        )}
      </div>

      {previewUrl ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/[0.12] bg-slate-950 group">
          <Image src={previewUrl} alt="Upload preview" fill className="object-contain p-2" />
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
              : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center text-xl mx-auto mb-3">
            📷
          </div>
          <p className="text-sm font-semibold text-white">
            Click to upload or drag & drop photo
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{sublabel}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
          <span>⚠️</span> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
