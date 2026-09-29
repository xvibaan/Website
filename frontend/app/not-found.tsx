import Link from "next/link";
import { Terminal, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
        <Terminal className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-6xl font-bold font-mono tracking-tight text-white mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Module or Page Not Found</h2>
      <p className="text-gray-500 max-w-md mb-8 text-sm">
        The requested resource does not exist or has been moved. Verify the destination or return to the marketplace.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Marketplace
      </Link>
    </div>
  );
}
