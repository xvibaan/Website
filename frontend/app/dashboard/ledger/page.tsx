"use client";

import React from "react";
import Link from "next/link";
import {
  Receipt,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Plus,
  CreditCard,
  History,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import WalletTransactionTable from "@/components/WalletTransactionTable";
import { useAuth } from "@/context/AuthContext";

export default function WalletLedgerPage() {
  const { user } = useAuth();
  const balance = Number((user as any)?.wallet?.balance || 0);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 px-3 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2 min-h-[40px] text-xs font-mono text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/payments"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment History</span>
            </Link>
            <Link
              href="/dashboard/deposit"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,194,255,0.25)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Funds</span>
            </Link>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-emerald-400 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>FINANCIAL AUDIT LEDGER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Wallet Ledger
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Complete chronological accounting of all credits, debits, refunds, and running balances for {user?.email}
              </p>
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-[#0c0e17]/90 border border-primary/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-400">Vault Balance</div>
              <div className="text-base font-extrabold text-white font-mono">
                ₹{balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Immutable Double-Entry Ledger</h3>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Wallet recharges (deposits) and marketplace purchases (order debits) are maintained as separate transaction entries with permanent balance auditing.
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="space-y-4">
          <WalletTransactionTable />
        </div>
      </div>
    </ProtectedRoute>
  );
}
