"use client";

import React, { useState } from "react";
import { ShoppingCart, CheckCircle, Package } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface ProductVariant {
  id: number;
  config_name: string | null;
  duration: string;
  selling_price: number;
  available_keys?: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  variants: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants.length > 0 ? product.variants[0].id : 0
  );
  const [isBuying, setIsBuying] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);

  const handleBuy = async () => {
    if (!user) {
      setError("Please log in to purchase.");
      return;
    }
    
    if (!selectedVariant) return;
    
    setIsBuying(true);
    setError(null);
    setPurchaseSuccess(false);

    try {
      await api.post("/v1/orders/", {
        variant_id: selectedVariant.id,
        quantity: 1,
      });
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to complete purchase.");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col hover:border-primary/50 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center flex-shrink-0 group-hover:animate-glow transition-all">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-8 h-8 object-contain" />
          ) : (
            <Package className="w-6 h-6 text-primary" />
          )}
        </div>
        {selectedVariant && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              ${Number(selectedVariant.selling_price).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">{product.title}</h3>
      <p className="text-slate-400 text-sm line-clamp-2 mb-6 flex-1">
        {product.description || "Premium digital product ready for instant delivery."}
      </p>

      {product.variants.length > 0 ? (
        <div className="space-y-4 mt-auto">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Select Variant
            </label>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    selectedVariantId === variant.id
                      ? "bg-primary/20 border-primary text-white"
                      : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {variant.config_name || variant.duration}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            
            <button
              onClick={handleBuy}
              disabled={isBuying || purchaseSuccess || (selectedVariant?.available_keys === 0)}
              className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                purchaseSuccess
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : selectedVariant?.available_keys === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-hover text-white hover:shadow-lg hover:shadow-primary/20"
              }`}
            >
              {isBuying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : purchaseSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" /> Purchased!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {selectedVariant?.available_keys === 0 ? "Out of Stock" : "Instant Buy"}
                </>
              )}
            </button>
            {selectedVariant?.available_keys !== undefined && (
              <p className="text-center text-xs text-slate-500 mt-2">
                {selectedVariant.available_keys > 0 
                  ? `${selectedVariant.available_keys} in stock` 
                  : "Sold out"}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-4 border-t border-slate-800">
          <p className="text-slate-500 text-sm text-center">No variants available</p>
        </div>
      )}
    </div>
  );
}
