"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Package, ImageIcon, CheckCircle2, XCircle } from "lucide-react";

// --- Interfaces ---
interface ProductVariant {
  id: number;
  product_id: number;
  config_name: string | null;
  duration: string;
  price: number | string;
  is_active: boolean;
  available_stock: number;
}

interface Product {
  id: number;
  vendor_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  tg_update_url: string | null;
  tg_video_url: string | null;
  is_active: boolean;
  created_at: string;
  variants: ProductVariant[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/products/`);
      if (!res.ok) {
        throw new Error("Failed to load products. Please try again.");
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- Dynamic Calculation Helpers ---
  const getLowestPrice = (variants: ProductVariant[]): number | null => {
    const activeVariants = variants.filter((v) => v.is_active);
    if (activeVariants.length === 0) return null;
    return Math.min(...activeVariants.map((v) => Number(v.price)));
  };

  const getTotalStock = (variants: ProductVariant[]): number => {
    const activeVariants = variants.filter((v) => v.is_active);
    return activeVariants.reduce((sum, v) => sum + v.available_stock, 0);
  };

  // --- UI States ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500">Loading catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Products Found</h2>
        <p className="text-gray-500 mt-2">Check back later for new arrivals.</p>
      </div>
    );
  }

  // --- Main Grid Render ---
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500 mt-2">Browse our latest digital products and panels.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const startingPrice = getLowestPrice(product.variants);
          const totalStock = getTotalStock(product.variants);

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Product Image / Fallback */}
              <div className="relative h-48 bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                )}
                {!product.is_active && (
                  <div className="absolute top-2 right-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md">
                    Inactive
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-grow">
                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                  {product.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
                  {product.description || "No description available."}
                </p>

                {/* Stock Indicator */}
                <div className="flex items-center space-x-2 text-sm mb-3">
                  {totalStock > 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-700 font-medium">In Stock</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 font-medium">Out of Stock</span>
                    </>
                  )}
                </div>

                {/* Price Indicator */}
                <div className="text-xl font-black text-gray-900 mb-4">
                  {startingPrice !== null ? (
                    <>
                      <span className="text-sm font-medium text-gray-500 mr-1">Starting at</span>
                      ₹{startingPrice.toFixed(2)}
                    </>
                  ) : (
                    <span className="text-gray-400 text-base">Unavailable</span>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  href={`/products/${product.id}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
