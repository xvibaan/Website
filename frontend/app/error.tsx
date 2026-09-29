"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostics
    console.error("Application error captured:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 mb-6">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-400 max-w-md mb-8 text-sm leading-relaxed">
        An unexpected error occurred while loading this section. You can attempt to reload or navigate back to the marketplace.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Marketplace
        </Link>
      </div>
    </div>
  );
}
