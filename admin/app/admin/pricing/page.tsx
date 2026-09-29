"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Percent,
  TrendingUp,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  IndianRupee,
  Layers,
} from "lucide-react";

interface PricingItem {
  productId: string;
  name: string;
  slug: string;
  category: string;
  provider: string;
  costPrice: string;
  sellingPrice: string;
  currency: string;
  margin: string;
  marginPercentage: string;
  status: string;
}

export default function AdminPricingPage() {
  const [pricingList, setPricingList] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Pricing Modal State
  const [selectedProduct, setSelectedProduct] = useState<PricingItem | null>(null);
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPricing();
      if (res && res.pricing) {
        setPricingList(res.pricing);
      }
    } catch (err: any) {
      console.error("Pricing fetch error:", err);
      setError(err?.message || "Failed to retrieve pricing telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const openEditModal = (item: PricingItem) => {
    setSelectedProduct(item);
    setSellingPrice(item.sellingPrice);
    setCostPrice(item.costPrice || "0.00");
  };

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);

    const priceRegex = /^\d+(\.\d{1,2})?$/;
    if (!priceRegex.test(sellingPrice) || Number(sellingPrice) < 0) {
      setError("Selling price must be a valid non-negative decimal amount (e.g. 499.00)");
      setSubmitting(false);
      return;
    }

    if (costPrice && (!priceRegex.test(costPrice) || Number(costPrice) < 0)) {
      setError("Cost price must be a valid non-negative decimal amount (e.g. 250.00)");
      setSubmitting(false);
      return;
    }

    try {
      await adminApi.updatePricing(selectedProduct.productId, {
        sellingPrice,
        costPrice: costPrice || undefined,
      });

      setActionSuccess(`Pricing for '${selectedProduct.name}' updated successfully.`);
      setSelectedProduct(null);
      fetchPricing();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update pricing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Percent className="w-6 h-6 text-emerald-400" />
            <span>Pricing & Margin Controller</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative cost price, customer selling price, and real backend-calculated margins
          </p>
        </div>

        <button
          onClick={fetchPricing}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
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
            <span className="font-semibold block mb-0.5">Pricing error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pricing Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category / Provider</th>
                <th className="py-3.5 px-4">Provider Cost</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Margin (₹)</th>
                <th className="py-3.5 px-4">Margin %</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  </td>
                </tr>
              ) : pricingList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No products configured for pricing telemetry.
                  </td>
                </tr>
              ) : (
                pricingList.map((item) => {
                  const marginNum = Number(item.margin);
                  const isPositive = marginNum >= 0;
                  return (
                    <tr key={item.productId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-white block">{item.name}</span>
                          <span className="text-[10px] font-mono text-gray-500 block truncate max-w-[180px]">
                            {item.slug}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        <div>
                          <span className="block">{item.category}</span>
                          <span className="text-[10px] font-mono text-gray-500 block">{item.provider}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                        ₹{Number(item.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold text-sm">
                        ₹{Number(item.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className={isPositive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                          ₹{marginNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {item.marginPercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs flex items-center gap-1 ml-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Pricing Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Adjust Product Pricing</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <span className="font-semibold text-white block text-sm">{selectedProduct.name}</span>
              <span className="text-gray-400 block font-mono">Category: {selectedProduct.category}</span>
            </div>

            <form onSubmit={handleUpdatePricing} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-emerald-400 uppercase mb-1">
                  Customer Selling Price (₹) *
                </label>
                <input
                  type="text"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full bg-black/50 border border-emerald-500/30 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-amber-400 uppercase mb-1">
                  Provider Cost Price (₹) (Admin Only)
                </label>
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-black/50 border border-amber-500/30 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-semibold focus:outline-none"
                />
              </div>

              {/* Dynamic Margin Preview */}
              {Number(sellingPrice) >= 0 && Number(costPrice) >= 0 && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono flex items-center justify-between">
                  <span className="text-gray-400">Estimated Margin:</span>
                  <span className="text-white font-bold">
                    ₹{(Number(sellingPrice) - Number(costPrice)).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Pricing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
