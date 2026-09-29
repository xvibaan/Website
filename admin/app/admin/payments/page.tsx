"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Filter,
  Eye,
  ArrowDownLeft,
  FileSpreadsheet,
} from "lucide-react";

interface PaymentItem {
  id: string;
  userId: string;
  userEmail?: string;
  amount: string;
  currency: string;
  status: string;
  purpose: string;
  gateway: string;
  gatewayReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [purposeFilter, setPurposeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Payment detail inspection modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPayments({
        status: statusFilter || undefined,
        purpose: purposeFilter || undefined,
        page,
        limit: 15,
      });

      if (res && res.payments) {
        setPayments(res.payments);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      console.error("Payments fetch error:", err);
      setError(err?.message || "Failed to retrieve payment records.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, purposeFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const viewPaymentDetails = async (payment: PaymentItem) => {
    setSelectedPayment(payment);
    setRefunds([]);
    setLoadingDetail(true);

    try {
      const res = await adminApi.getPayment(payment.id);
      if (res && res.refunds) {
        setRefunds(res.refunds);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load payment detail.");
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-amber-400" />
            <span>Gateway Ingestion & Payments</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative gateway intake journal (Note: Wallet deposits represent Customer Liability, distinct from Product Revenue)
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Accounting Clarification Notice */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-white">
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          <span>Accounting Principle: Wallet Ingestion vs Product Revenue</span>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed">
          Completed gateway payments credit central customer wallets and create matching platform liability.
          Product sale revenue recognition occurs solely when order fulfillment claims wallet funds.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0b0e17] border border-white/10 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-400">Filter By:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-gray-300 focus:outline-none"
        >
          <option value="" className="bg-[#0b0e17]">All Statuses</option>
          <option value="COMPLETED" className="bg-[#0b0e17]">Completed</option>
          <option value="PENDING" className="bg-[#0b0e17]">Pending</option>
          <option value="FAILED" className="bg-[#0b0e17]">Failed</option>
          <option value="REFUNDED" className="bg-[#0b0e17]">Refunded</option>
        </select>

        <select
          value={purposeFilter}
          onChange={(e) => {
            setPurposeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-gray-300 focus:outline-none"
        >
          <option value="" className="bg-[#0b0e17]">All Purposes</option>
          <option value="WALLET_TOPUP" className="bg-[#0b0e17]">Wallet Top-Up</option>
          <option value="ORDER_PAYMENT" className="bg-[#0b0e17]">Direct Order</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Payment Reference</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Loading payment ingestion journal...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No payment records match the query.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-white block font-semibold">{p.id}</span>
                      <span className="text-[10px] text-gray-500 block truncate max-w-[160px]">
                        {p.gatewayReference || "No Gateway Ref"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-gray-200 block">{p.userEmail || "Customer"}</span>
                      <span className="text-[10px] font-mono text-gray-500 block truncate max-w-[160px]">
                        {p.userId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                      ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {p.gateway}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : p.status === "PENDING"
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                        }`}
                      >
                        {p.status === "COMPLETED" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : p.status === "PENDING" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => viewPaymentDetails(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                        title="View Payment Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
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
            Showing <strong className="text-white">{payments.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> transactions
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

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Payment Transaction Detail</h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Payment ID</span>
                <span className="text-white break-all">{selectedPayment.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Amount</span>
                  <span className="text-emerald-400 font-bold text-base">
                    ₹{Number(selectedPayment.amount).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Status</span>
                  <span className="text-white uppercase font-bold">{selectedPayment.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Gateway Provider</span>
                <span className="text-white">{selectedPayment.gateway}</span>
                <span className="text-[10px] text-gray-500 block mt-1">
                  Ref: {selectedPayment.gatewayReference || "None"}
                </span>
              </div>

              {refunds.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <span className="font-bold block">Refund Records</span>
                  {refunds.map((r, i) => (
                    <div key={i} className="text-[11px] mt-1">
                      ₹{r.amount} - {r.reason || "Refunded"} ({new Date(r.createdAt).toLocaleString()})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
