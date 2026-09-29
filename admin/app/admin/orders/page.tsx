"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  ShoppingBag,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orderContract, setOrderContract] = useState<{
    status: string;
    message: string;
    phase: string;
    orders: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrdersStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOrders();
      setOrderContract(res);
    } catch (err: any) {
      console.error("Orders status fetch error:", err);
      setError(err?.message || "Failed to retrieve order fulfillment status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            <span>Order Fulfillment Engine</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative order lifecycle, automated server provisioning, and lifecycle state management
          </p>
        </div>

        <button
          onClick={fetchOrdersStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Contract Notice Card */}
      <div className="p-8 rounded-2xl bg-[#0b0e17] border border-amber-500/20 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <div className="max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-semibold uppercase">
            <span>{orderContract?.status || "ORDER FULFILLMENT SCHEDULED"}</span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-wide">
            Automated Provisioning Pipeline Pending
          </h2>

          <p className="text-xs text-gray-400 leading-relaxed">
            {orderContract?.message ||
              "Order fulfillment engine, multi-provider dispatch queue, and automated server credential generation are strictly scheduled for future implementation phases. No synthetic or unverified order records are displayed."}
          </p>
        </div>

        {/* Architecture Spec Notice */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-black/40 border border-white/5 text-left text-xs font-mono text-gray-300 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500 pb-2 border-b border-white/5">
            <span>UPSTREAM FULFILLMENT ARCHITECTURE</span>
            <span className="text-[#00c2ff]">Phase 8 Specification</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-white/5">
              <span className="text-[10px] text-gray-500 block">Dispatch Queue</span>
              <span className="text-white font-semibold">Idempotent Worker</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5">
              <span className="text-[10px] text-gray-500 block">Ledger Debit</span>
              <span className="text-white font-semibold">Pre-Auth Reservation</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5">
              <span className="text-[10px] text-gray-500 block">Provider Delivery</span>
              <span className="text-white font-semibold">Adapter Fallback</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
