"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Gift,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Product } from "@/components/ProductCard";

export interface RedeemCodeCenterProps {
  onRedeemed?: () => void;
}

export function RedeemCodeCenter({}: RedeemCodeCenterProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRedeemProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const redeemList = data.filter((p: Product) => {
              const cat = (p.category || "").toLowerCase();
              const title = (p.title || "").toLowerCase();
              return (
                cat.includes("redeem") ||
                cat.includes("voucher") ||
                cat.includes("gift") ||
                title.includes("voucher") ||
                title.includes("redeem") ||
                title.includes("card")
              );
            });
            setProducts(redeemList.length > 0 ? redeemList : data.slice(0, 4));
          }
        }
      } catch (err) {
        console.error("Failed to load redeem code products:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRedeemProducts();
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#121626]/90 via-[#0a0c16]/80 to-[#080910]/90 backdrop-blur-2xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-24 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 left-10 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 max-w-3xl mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-semibold mb-3">
          <Gift className="w-3.5 h-3.5" />
          <span>OFFICIAL DIGITAL VOUCHERS & REDEEM CODES</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Redeem Codes & Digital Vouchers
        </h2>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Redeem Codes are digital products available for direct purchase with your central wallet balance. Upon successful purchase, your unique redemption code and instructions are delivered instantly to your account.
        </p>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Direct Purchase</h3>
            <p className="text-xs text-gray-400 mt-1">Buy vouchers directly using your wallet balance.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Instant Delivery</h3>
            <p className="text-xs text-gray-400 mt-1">Delivered instantly to your Purchased Products section.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Official & Verified</h3>
            <p className="text-xs text-gray-400 mt-1">All codes are generated through authorized providers.</p>
          </div>
        </div>
      </div>

      {/* Products Showcase */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Featured Redeem Code Products</span>
          </h3>
          <Link
            href="/products?category=Redeem%20Codes"
            className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <Gift className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-300">No redeem code products available currently.</p>
            <p className="text-xs text-gray-500 mt-1">Check back soon for new digital voucher drops.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const sellingPrice = Number(prod.sellingPrice ?? (Number(prod.basePrice || 0) + Number(prod.margin || 0)));
              const faceValue = prod.face_value || prod.faceValue;
              const hasDiscount = faceValue && faceValue > sellingPrice;
              const discountPercent = hasDiscount
                ? Math.round(((faceValue - sellingPrice) / faceValue) * 100)
                : null;

              const displayCategory =
                typeof prod.category === "object" && prod.category !== null
                  ? (prod.category as any).name
                  : prod.category || "Redeem Code";

              return (
                <div
                  key={prod.id}
                  className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">
                        {displayCategory}
                      </span>
                      {!prod.isArchived ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>In Stock</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          Unavailable
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                      {prod.title}
                    </h4>

                    {prod.features && prod.features.length > 0 && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {prod.features.join(" • ")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <div className="flex items-baseline justify-between">
                      <div>
                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] text-gray-500 line-through font-mono">
                              ₹{faceValue.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              {discountPercent}% OFF
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-gray-400 font-mono">₹</span>
                          <span className="text-lg font-extrabold text-white font-mono">
                            {sellingPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/products/${prod.id}`}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy Code</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RedeemCodeCenter;
