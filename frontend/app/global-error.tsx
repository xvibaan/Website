"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error captured:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#080910] text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 inline-block">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
              Application Error
            </h1>
            <p className="text-gray-400 text-sm">
              A critical error occurred. Please refresh or return to the marketplace.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload App
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
