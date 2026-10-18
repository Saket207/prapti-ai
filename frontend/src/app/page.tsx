import Link from "next/link";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative background glow spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-600/20 via-indigo-600/20 to-emerald-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-semibold shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            AI-Powered Lost & Found for DSCE Campus
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Stop digging through WhatsApp groups.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">
              Get it back with Prapti.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Prapti (*प्राप्ति* = obtaining) automatically pairs lost belongings with found reports across Dayananda Sagar College of Engineering using multimodal CLIP vision vectors, privacy-preserving face blurring, and cryptographic QR verification.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/lost"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-lg shadow-rose-500/25 transition-all duration-200 transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
            >
              <span>🔎</span> I Lost Something
            </Link>

            <Link
              href="/found"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/25 transition-all duration-200 transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
            >
              <span>🎁</span> I Found an Item
            </Link>

            <Link
              href="/items"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:text-white transition-all text-center"
            >
              My Reported Items
            </Link>
          </div>
        </div>

        {/* 4 Feature Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-20">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-cyan-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🧠
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Multimodal AI Matching</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              OpenAI CLIP vector embeddings map photos and natural language into a 512-dim space to match images with text descriptions automatically.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-emerald-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🛡️
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Privacy Face & ID Blurring</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              OpenCV CLAHE and Haar Cascades detect and blur human faces and student roll numbers in photos before they ever reach public storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-indigo-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🔐
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Secret Verification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Finders set secret ownership questions (e.g. lockscreen wallpaper). Claimants have 3 attempts to verify ownership before account lockout.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-amber-500/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📲
            </div>
            <h3 className="font-bold text-lg text-white mb-2">QR Code Handover</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upon successful verification, a one-time cryptographic QR token closes the audit loop when scanned during the in-person campus handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
