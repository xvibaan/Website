"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingBag,
  KeyRound,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Calendar,
  CreditCard,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Receipt,
  FileCheck2,
  Tag,
} from "lucide-react";

export interface OrderDetailsModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<{ [index: number]: boolean }>({});

  if (!isOpen || !order) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (index: number) => {
    setRevealedKeys((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently Recorded";

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>COMPLETED</span>
        </span>
      );
    }
    if (s === "PENDING" || s === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>{s}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold">
        <XCircle className="w-3.5 h-3.5" />
        <span>{s || "CANCELLED"}</span>
      </span>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#0a0c16] border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 my-8"
        >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,194,255,0.2)]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-white font-mono">
                    ORDER #HM-{order.id}
                  </h3>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>{formattedDate}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            {/* Traceability Flow Indicator */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                <span>Transaction & Fulfillment Trace</span>
                <span className="text-primary font-bold">Verified Transaction</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  <span className="font-bold block">1. Placed</span>
                  <span className="text-[10px] opacity-75 font-mono">Order Created</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  <span className="font-bold block">2. Payment</span>
                  <span className="text-[10px] opacity-75 font-mono">Wallet Vault</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  order.status === "COMPLETED"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                }`}>
                  {order.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  ) : (
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                  )}
                  <span className="font-bold block">3. Fulfillment</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {order.status === "COMPLETED" ? "Instant Key" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchased Items List */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span>Purchased Product Items ({order.items?.length || 0})</span>
              </h4>

              <div className="space-y-3">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    const isRevealed = revealedKeys[idx];
                    const keyValue = item.product_key?.key_value;
                    const isRedeemCode =
                      (item.category && item.category.toLowerCase().includes("redeem")) ||
                      (item.product_name_snapshot &&
                        (item.product_name_snapshot.toLowerCase().includes("voucher") ||
                          item.product_name_snapshot.toLowerCase().includes("redeem") ||
                          item.product_name_snapshot.toLowerCase().includes("code")));

                    const hasDiscount =
                      item.discount_percent !== undefined &&
                      item.discount_percent !== null &&
                      item.discount_percent > 0;

                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 sm:p-5 rounded-2xl bg-[#0e111d] border border-white/10 space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div>
                            <div className="font-bold text-white text-sm sm:text-base">
                              {item.product_name_snapshot || "Marketplace Software Package"}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-semibold">
                                {item.variant_name_snapshot || "Standard Edition"}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {isRedeemCode ? "Digital Redeem Code" : "Digital License"}
                              </span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right font-mono shrink-0">
                            {item.face_value && item.face_value > (item.price_at_purchase ?? order.total_amount) && (
                              <div className="text-[11px] text-gray-400 line-through">
                                Face Value: ₹{Number(item.face_value).toFixed(2)}
                              </div>
                            )}
                            <div className="flex sm:flex-col items-baseline sm:items-end gap-2">
                              <span className="text-sm sm:text-base font-extrabold text-white">
                                Paid: ₹{Number(item.price_at_purchase ?? order.total_amount).toFixed(2)}
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {item.discount_percent}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delivered Code / Key Delivery Section */}
                        {keyValue ? (
                          <div className="p-3.5 rounded-xl bg-black/40 border border-primary/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-300 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                                <KeyRound className="w-3.5 h-3.5 text-primary" />
                                <span>{isRedeemCode ? "Your Redeem Code" : "Your Activation Key"}</span>
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Delivered</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-black/70 border border-white/10 px-3 py-2.5 rounded-xl font-mono text-xs sm:text-sm text-white overflow-x-auto select-all break-all tracking-wider font-bold">
                                {isRevealed ? keyValue : "••••••••-••••-••••-••••"}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleReveal(idx)}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
                                title={isRevealed ? "Hide Code" : "Reveal Code"}
                                aria-label={isRevealed ? "Hide Code" : "Reveal Code"}
                              >
                                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopy(keyValue)}
                                className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold transition-colors shrink-0 flex items-center justify-center min-h-[42px] min-w-[42px] shadow-[0_0_12px_rgba(0,194,255,0.25)]"
                                title="Copy Code"
                                aria-label="Copy Code"
                              >
                                {copiedKey === keyValue ? (
                                  <Check className="w-4 h-4 text-emerald-950 font-extrabold" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center gap-2.5 text-xs text-gray-400 font-mono">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Your code will appear here after fulfillment.</span>
                          </div>
                        )}
                        {/* Resource links */}
                        {item.product_id && (
                          <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs border-t border-white/5">
                            <span className="text-[11px] text-gray-500 font-mono">
                              Instructions & Video Guides:
                            </span>
                            <a
                              href={`/products/${item.product_id}`}
                              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary hover:underline hover:text-primary-hover transition-colors"
                            >
                              <span>View How to Use & Tutorial</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-xl bg-white/5 text-xs text-gray-400">
                    Standard Digital Item
                  </div>
                )}
              </div>
            </div>

            {/* Financial Ledger & Summary Breakdown */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-2">
                Accounting & Payment Summary
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Payment Method</span>
                <span className="font-mono text-white font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3 text-primary" />
                  <span>Host Wallet Vault Balance</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Subtotal</span>
                <span className="font-mono text-white">₹{Number(order.total_amount).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Processing / Gateway Fees</span>
                <span className="font-mono text-emerald-400">₹0.00 (Zero Fee)</span>
              </div>

              <div className="border-t border-white/10 pt-2.5 flex items-center justify-between font-bold">
                <span className="text-white text-sm">Total Paid</span>
                <span className="text-base text-primary font-mono">
                  ₹{Number(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.01] flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
              Host Market Place Secure Fulfillment Engine
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors ml-auto"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
