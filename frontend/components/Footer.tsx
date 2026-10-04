"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { useNavigation } from "@/context/NavigationContext";

export default function Footer() {
  const pathname = usePathname();
  const { contentSettings } = useNavigation();

  // Hide footer on private/auth routes
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password")
  ) {
    return null;
  }

  const marketplaceTitle = contentSettings?.marketplaceTitle || "Host Market Place";

  return (
    <footer className="mt-12 border-t border-white/10 bg-[#06080e]/80 backdrop-blur-xl relative z-10 w-full overflow-hidden shrink-0">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Identity */}
          <div className="md:col-span-2 flex flex-col items-start min-w-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 shadow-[0_0_15px_rgba(0,194,255,0.2)] flex items-center justify-center rounded-xl shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wider leading-tight truncate">
                  {marketplaceTitle.split(" ")[0]?.toUpperCase() || "HOST"}
                </span>
                <span className="font-semibold text-[10px] text-primary tracking-widest leading-none mt-0.5 uppercase font-mono truncate">
                  {marketplaceTitle.split(" ").slice(1).join(" ") || "MARKET PLACE"}
                </span>
              </div>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md">
              Digital marketplace for software, games, redeem codes, AI tools, and cloud hosting with central wallet and order management.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Host Platform</span>
            </div>
          </div>

          {/* Links: Platform */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/products" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  Marketplace Catalog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  User Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Legal & Policy */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white mb-4">
              Legal & Policies
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/terms" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-xs text-gray-400 hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-mono text-gray-500">
            &copy; {new Date().getFullYear()} [INSERT_LEGAL_COMPANY_NAME]. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
