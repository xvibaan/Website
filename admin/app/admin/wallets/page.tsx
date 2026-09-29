"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Wallet,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  History,
  Scale,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface WalletItem {
  id: string;
  userId: string;
  userEmail?: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface LedgerItem {
  id: string;
  walletId: string;
  entryType: string;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Wallet Modal for Ledger & Details
  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Reconciliation State
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [reconciling, setReconciling] = useState(false);

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    direction: "credit" as "credit" | "debit",
    amount: "100.00",
    reason: "",
  });
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getWallets({
        search: search.trim() || undefined,
        page,
        limit: 15,
      });

      if (res && res.wallets) {
        setWallets(res.wallets);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      console.error("Wallets fetch error:", err);
      setError(err?.message || "Failed to retrieve central customer wallets.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWallets();
  };

  const openWalletDetails = async (wallet: WalletItem) => {
    setSelectedWallet(wallet);
    setLedgerEntries([]);
    setReconciliation(null);
    setLoadingLedger(true);

    try {
      const res = await adminApi.getWallet(wallet.userId);
      if (res && res.ledger) {
        setLedgerEntries(res.ledger);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load wallet ledger history.");
    } finally {
      setLoadingLedger(false);
    }
  };

  const runReconciliation = async (userId: string) => {
    setReconciling(true);
    setError(null);
    try {
      const res = await adminApi.reconcileWallet(userId);
      if (res && res.reconciliation) {
        setReconciliation(res.reconciliation);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to run ledger reconciliation.");
    } finally {
      setReconciling(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    setSubmittingAdjust(true);
    setError(null);

    const amountRegex = /^\d+(\.\d{1,2})?$/;
    if (!amountRegex.test(adjustData.amount) || Number(adjustData.amount) <= 0) {
      setError("Please enter a valid positive monetary amount (e.g. 100.00).");
      setSubmittingAdjust(false);
      return;
    }

    if (!adjustData.reason.trim()) {
      setError("An authoritative audit trail reason is required for administrative adjustments.");
      setSubmittingAdjust(false);
      return;
    }

    try {
      const res = await adminApi.adjustWallet(selectedWallet.userId, {
        direction: adjustData.direction,
        amount: adjustData.amount,
        reason: adjustData.reason.trim(),
        idempotencyKey: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      if (res.success) {
        setActionSuccess(
          `Successfully ${adjustData.direction === "credit" ? "credited" : "debited"} ₹${adjustData.amount} for wallet.`
        );
        setIsAdjustModalOpen(false);
        setAdjustData({ direction: "credit", amount: "100.00", reason: "" });
        // Refresh details
        openWalletDetails(selectedWallet);
        fetchWallets();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || "Wallet adjustment failed.");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>Central Wallets & Double-Entry Ledgers</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative customer balances backed by immutable double-entry ledger journals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWallets}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Wallet operation error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#0b0e17] border border-white/10 p-3 rounded-2xl">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer email or user ID..."
            className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Wallets Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Account Holder</th>
                <th className="py-3.5 px-4">Wallet ID</th>
                <th className="py-3.5 px-4">Authoritative Balance</th>
                <th className="py-3.5 px-4">Currency</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>Reading wallet balances from database...</span>
                    </div>
                  </td>
                </tr>
              ) : wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No customer wallets found.
                  </td>
                </tr>
              ) : (
                wallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block">
                          {wallet.userEmail || "Customer"}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 block truncate max-w-[200px]">
                          {wallet.userId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {wallet.id}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-emerald-400 font-bold text-sm">
                        ₹{Number(wallet.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {wallet.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> {wallet.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openWalletDetails(wallet)}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs font-medium"
                      >
                        Inspect Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing <strong className="text-white">{wallets.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> wallets
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-gray-300">
              {page} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ledger & Wallet Detail Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-4xl w-full rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <span>Wallet Ledger Audit Journal</span>
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {selectedWallet.userEmail} ({selectedWallet.userId})
                </span>
              </div>
              <button
                onClick={() => setSelectedWallet(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallet Summary Card & Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 font-mono">
                <span className="text-[10px] text-emerald-400 uppercase block">Cached Wallet Balance</span>
                <span className="text-xl font-bold text-emerald-400">
                  ₹{Number(selectedWallet.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Reconciliation</span>
                  <span className="text-xs text-gray-200">
                    {reconciliation
                      ? reconciliation.isMatched
                        ? "100% In Sync"
                        : "Mismatch Detected!"
                      : "Not Checked"}
                  </span>
                </div>
                <button
                  onClick={() => runReconciliation(selectedWallet.userId)}
                  disabled={reconciling}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all disabled:opacity-50"
                >
                  {reconciling ? "Checking..." : "Reconcile"}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Admin Mutation</span>
                  <span className="text-xs text-gray-200">Manual Credit/Debit</span>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-semibold"
                >
                  Adjust Balance
                </button>
              </div>
            </div>

            {/* Reconciliation Report if calculated */}
            {reconciliation && (
              <div
                className={`p-3.5 rounded-xl text-xs font-mono space-y-1 ${
                  reconciliation.isMatched
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {reconciliation.isMatched ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>
                    {reconciliation.isMatched
                      ? "Reconciliation Passed: Ledger entries perfectly match cached balance."
                      : "Reconciliation Failed: Discrepancy detected!"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div>Cached: ₹{reconciliation.cachedBalance}</div>
                  <div>Calculated: ₹{reconciliation.ledgerCalculatedBalance}</div>
                  <div>Credits: ₹{reconciliation.totalCredits}</div>
                  <div>Debits: ₹{reconciliation.totalDebits}</div>
                </div>
              </div>
            )}

            {/* Ledger Entries Table */}
            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Before → After</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {loadingLedger ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Streaming ledger history...</span>
                        </div>
                      </td>
                    </tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No ledger transactions recorded yet for this wallet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              entry.entryType.includes("CREDIT") || entry.entryType.includes("DEPOSIT")
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          ₹{Number(entry.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">
                          ₹{Number(entry.balanceBefore).toFixed(2)} → ₹{Number(entry.balanceAfter).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 truncate max-w-xs">
                          {entry.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedWallet(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Wallet Warning Dialog */}
      {isAdjustModalOpen && selectedWallet && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-amber-500/30 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Administrative Wallet Adjustment</h3>
                <span className="text-xs text-gray-400 block">{selectedWallet.userEmail}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-relaxed">
              <strong>CRITICAL FINANCIAL ACTION:</strong> All manual modifications generate an immutable
              double-entry ledger journal entry and record your Master Admin ID to the audit trail.
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Adjustment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustData((prev) => ({ ...prev, direction: "credit" }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      adjustData.direction === "credit"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-black/40 text-gray-400 border-white/10"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Credit (Add Funds)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustData((prev) => ({ ...prev, direction: "debit" }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      adjustData.direction === "debit"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-black/40 text-gray-400 border-white/10"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>Debit (Deduct Funds)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Adjustment Amount (₹) *
                </label>
                <input
                  type="text"
                  required
                  value={adjustData.amount}
                  onChange={(e) => setAdjustData({ ...adjustData, amount: e.target.value })}
                  placeholder="100.00"
                  className="w-full bg-black/50 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Authoritative Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="e.g. Compensation for downtime ticket #4092"
                  className="w-full bg-black/50 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={submittingAdjust}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold flex items-center gap-1.5"
                >
                  {submittingAdjust && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Mutation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
