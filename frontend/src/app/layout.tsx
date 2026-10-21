import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Prapti-AI — Smart Campus Lost & Found | DSCE",
  description: "AI-powered lost-and-found matching with CLIP embeddings and privacy protection for Dayananda Sagar College of Engineering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <p>© 2026 Prapti-AI • Dayananda Sagar College of Engineering (DSCE), Bengaluru</p>
          <p className="mt-1 text-[11px] text-slate-600">Multimodal CLIP Vision Engine • OpenCV Privacy Masking • Supabase pgvector</p>
        </footer>
      </body>
    </html>
  );
}
