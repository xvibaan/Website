"use client";

import React from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, ShieldCheck, Sparkles, CreditCard, History } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Card3D from "@/components/Card3D";

interface WalletWidgetProps {
  onViewTransactions?: () => void;
}

export default function WalletWidget({ onViewTransactions }: WalletWidgetProps) {
  const { user } = useAuth();
  const balance = (user as any)?.wallet?.balance || 0.0;

  return (
    <Card3D depth={9} className="h-full">
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#121526] via-[#0c0e1a] to-[#080912] border border-white/15 backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between h-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] group">
        {/* Holographic Sheen Layer */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 194, 255, 0.2) 0%, rgba(123, 97, 255, 0.15) 50%, transparent 100%)",
          }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header & Chip Graphic */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Metallic Chip Visual */}
              <div className="w-9 h-7 sm:w-10 sm:h-8 rounded-lg bg-gradient-to-br from-amber-200/30 via-amber-400/20 to-amber-600/30 border border-amber-300/40 relative overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                <div className="w-full h-0.5 bg-amber-300/30 absolute" />
                <div className="h-full w-0.5 bg-amber-300/30 absolute" />
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-amber-300/40" />
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-gray-400 font-semibold">
                DIGITAL VAULT
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
              <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>ENCRYPTED</span>
            </div>
          </div>

          {/* Balance Amount */}
          <div className="my-3 sm:my-4">
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono uppercase tracking-widest mb-1">
              Available Balance
            </p>
            <div className="flex items-baseline gap-1 overflow-hidden">
              <span className="text-xl sm:text-2xl font-light text-primary font-mono">₹</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight drop-shadow-md truncate">
                {Number(balance).toFixed(2)}
              </h2>
            </div>
          </div>
        </div>

        {/* Card Number Mask & Holder */}
        <div className="relative z-10 py-2.5 sm:py-3 border-y border-white/[0.08] my-3 sm:my-4 flex flex-wrap items-center justify-between font-mono text-[11px] sm:text-xs text-gray-400 gap-1">
          <span className="tracking-widest">•••• •••• •••• {user?.id ? String(user.id).slice(-4).padStart(4, "0") : "8492"}</span>
          <span className="text-[10px] text-gray-500 uppercase truncate max-w-[130px]">{user?.email?.split("@")[0] || "HOST MEMBER"}</span>
        </div>

        {/* Actions Button Row */}
        <div className="relative z-10 flex flex-col gap-2 pt-1 sm:pt-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/deposit"
              className="flex-1 py-3 px-4 min-h-[44px] bg-primary hover:bg-primary-hover text-black font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Funds</span>
            </Link>
            <Link
              href="/dashboard/deposit"
              className="p-3 min-h-[44px] min-w-[44px] bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              title="Manage Wallet"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {onViewTransactions && (
            <button
              type="button"
              onClick={onViewTransactions}
              className="w-full py-2.5 px-3 min-h-[40px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <span>View Historical Ledger</span>
            </button>
          )}
        </div>
      </div>
    </Card3D>
  );
}
