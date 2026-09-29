"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Tag,
  ImageIcon,
} from "lucide-react";
import Card3D from "@/components/Card3D";
import { Badge } from "./ui/Badge";

export interface Product {
  id: string | number;
  name?: string;
  title: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  originalPrice?: number | string | null;
  sellingPrice?: number | string;
  basePrice?: number | string;
  price?: number | string;
  margin?: number;
  face_value?: number;
  faceValue?: number;
  currency?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  isArchived?: boolean;
  is_active?: boolean;
  status?: string;
  features?: string[];
  variants?: any[];
}

interface ProductCardProps {
  product: Product;
  onSelect?: () => void;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayTitle = product.name || product.title;
  const displaySlug = product.slug || product.id;
  const displayCategory =
    typeof product.category === "object" && product.category !== null
      ? (product.category as any).name
      : product.category || "Digital Product";
  const displayDescription = product.shortDescription || product.description;

  const rawSelling = product.sellingPrice ?? product.price ?? product.basePrice ?? 0;
  const sellingPrice = Number(rawSelling);

  const rawOriginal = product.originalPrice ?? product.face_value ?? (product as any).faceValue ?? null;
  const originalPrice = rawOriginal !== null && rawOriginal !== undefined && !isNaN(Number(rawOriginal))
    ? Number(rawOriginal)
    : null;

  // Authoritative discount calculation: Only shown if original price is strictly greater than selling price
  const hasRealDiscount = originalPrice !== null && originalPrice > sellingPrice && sellingPrice > 0;
  const discountPercent = hasRealDiscount ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0;

  const imageSrc = product.imageUrl || product.image_url;
  const isAvailable = product.is_active !== false && product.status !== "DISABLED" && product.status !== "OUT_OF_STOCK";

  return (
    <Card3D depth={8} className="h-full">
      <div className="h-full rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#101322]/90 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between transition-colors duration-300 group hover:border-primary/40 hover:shadow-[0_0_25px_rgba(0,194,255,0.12)]">
        {/* Subtle Ambient Radial Flare */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none opacity-15 blur-2xl bg-primary" />

        {/* Top Header Information & Product Visual */}
        <div className="relative z-10 flex flex-col flex-grow">
          {/* Product Image / Visual Showcase */}
          <div className="relative h-44 w-full bg-black/50 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden mb-3.5 shadow-inner">
            {imageSrc && !imageError ? (
              <Image
                src={imageSrc}
                alt={displayTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <ImageIcon className="w-10 h-10 mb-1.5 opacity-40 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold truncate max-w-[180px]">
                  {displayCategory}
                </span>
              </div>
            )}

            {!isAvailable && (
              <div className="absolute top-2.5 right-2.5 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                {product.status === "OUT_OF_STOCK" ? "Out of Stock" : "Unavailable"}
              </div>
            )}
          </div>

          {/* Category Badge & Availability Tag */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary truncate max-w-[160px]">
              {displayCategory}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Verified</span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
            {displayTitle}
          </h3>

          {/* Short Description */}
          {displayDescription && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
              {displayDescription}
            </p>
          )}

          {/* Features Preview (if available) */}
          {product.features && product.features.length > 0 && (
            <div className="space-y-1.5 mb-4 mt-auto pt-2">
              {product.features.slice(0, 2).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          )}

          {/* Authoritative Pricing Section */}
          <div className="my-2.5 mt-auto pt-2">
            {hasRealDiscount && originalPrice ? (
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-gray-500 line-through font-mono">
                  ₹{originalPrice.toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  {discountPercent}% OFF
                </span>
              </div>
            ) : null}

            <div className="flex items-baseline gap-1">
              <span className="text-xs font-medium text-gray-400">₹</span>
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                {sellingPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono ml-1 uppercase">
                {product.currency || "INR"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2 mt-2">
          <Link
            href={`/products/${displaySlug}`}
            className="flex items-center justify-center gap-1 py-2 px-3 min-h-[38px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>

          {isAvailable ? (
            <Link
              href={`/products/${displaySlug}`}
              className="py-2 px-3 min-h-[38px] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary/60 outline-none bg-primary hover:bg-primary-hover text-black shadow-[0_0_15px_rgba(0,194,255,0.25)] hover:shadow-[0_0_20px_rgba(0,194,255,0.4)]"
            >
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> Buy
              </span>
            </Link>
          ) : (
            <button
              disabled
              className="py-2 px-3 min-h-[38px] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
            >
              Out
            </button>
          )}
        </div>
      </div>
    </Card3D>
  );
}
