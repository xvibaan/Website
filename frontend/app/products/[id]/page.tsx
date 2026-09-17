"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  AlertCircle, 
  Package, 
  ImageIcon, 
  CheckCircle2, 
  XCircle,
  Video,
  Send,
  ShoppingCart,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.id) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiUrl}/products/${params.id}`);
        
        if (res.status === 404) {
          throw new Error("Product not found");
        }
        if (!res.ok) {
          throw new Error("Failed to load product details.");
        }
        
        const data: Product = await res.json();
        setProduct(data);
        
        // Auto-select the first active variant
        const activeVariants = data.variants.filter((v) => v.is_active);
        if (activeVariants.length > 0) {
          setSelectedVariantId(activeVariants[0].id);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params?.id]);

  // --- UI States ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-6">{error || "Product not found"}</p>
        <button
          onClick={() => router.push("/products")}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  // --- Derived State ---
  const activeVariants = product.variants.filter((v) => v.is_active);
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) || null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link 
        href="/products" 
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Marketplace
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Media & Details */}
        <div className="md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="relative w-full h-64 md:h-80 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-6 border border-gray-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-16 h-16 text-gray-300" />
            )}
            {!product.is_active && (
              <div className="absolute top-4 right-4 bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-md shadow-sm">
                Inactive
              </div>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {product.title}
          </h1>
          
          <div className="prose prose-sm text-gray-600 mb-8 whitespace-pre-wrap">
            {product.description || "No description available for this product."}
          </div>

          {/* Telegram Resource Links */}
          {(product.tg_update_url || product.tg_video_url) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Resources</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {product.tg_update_url && (
                  <a
                    href={product.tg_update_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Updates Channel
                  </a>
                )}
                {product.tg_video_url && (
                  <a
                    href={product.tg_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video / Feedback
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Variants & Action */}
        <div className="md:w-1/2 p-6 md:p-8 bg-gray-50/50 flex flex-col">
          {activeVariants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-xl border border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Currently Unavailable</h3>
              <p className="text-sm text-gray-500 mt-1">This product has no active purchase options right now.</p>
            </div>
          ) : (
            <>
              {/* Dynamic Price Display */}
              <div className="mb-6">
                <span className="text-sm font-medium text-gray-500 block mb-1">Total Price</span>
                <div className="text-4xl font-black text-gray-900">
                  {selectedVariant ? `₹${Number(selectedVariant.price).toFixed(2)}` : "Select an option"}
                </div>
              </div>

              {/* Dynamic Stock Indicator */}
              <div className="mb-8">
                {selectedVariant && selectedVariant.available_stock > 0 ? (
                  <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {selectedVariant.available_stock} in stock
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Out of stock
                  </div>
                )}
              </div>

              {/* Variant Selection List */}
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Choose Configuration
              </h3>
              <div className="space-y-3 mb-8 flex-grow">
                {activeVariants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  const isOutOfStock = variant.available_stock <= 0;
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        isSelected 
                          ? "border-blue-600 bg-blue-50/50" 
                          : "border-gray-200 bg-white hover:border-blue-300"
                      } ${isOutOfStock ? "opacity-60" : ""}`}
                    >
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {variant.duration}
                          {variant.config_name && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                              {variant.config_name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          ₹{Number(variant.price).toFixed(2)}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-blue-600" : "border-gray-300"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Purchase Action (Mock) */}
              <button
                disabled={!selectedVariant || selectedVariant.available_stock <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-sm ${
                  !selectedVariant || selectedVariant.available_stock <= 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                }`}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {!selectedVariant
                  ? "Select an option"
                  : selectedVariant.available_stock <= 0
                  ? "Out of Stock"
                  : "Purchase (Coming Soon)"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
