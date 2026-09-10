"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Package, 
  AlertCircle, 
  Loader2, 
  Tag, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar,
  FileDigit
} from "lucide-react";

interface Product {
  id: number;
  vendor_id: number;
  title: string;
  description: string | null;
  price: number;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        
        // Fetch all products since there is no individual ID endpoint yet
        const response = await fetch(`${apiUrl}/products/`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch product data from the server.");
        }
        
        const data: Product[] = await response.json();
        
        // Find the specific product matching the URL parameter
        const foundProduct = data.find((p) => String(p.id) === params.id);
        
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          setError("Product not found in the catalog.");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while loading the product.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-slate-400 font-medium">Loading product details...</p>
      </div>
    );
  }

  // 2. Error State
  if (error || !product) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="bg-card p-8 rounded-2xl border border-red-500/30 text-center max-w-md shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {error === "Product not found in the catalog." ? "Product Not Found" : "Oops! Something went wrong"}
          </h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <Link 
            href="/products"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // 3. Success State - Product Details
  const formattedDate = new Date(product.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Navigation */}
      <Link 
        href="/products" 
        className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-primary transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Products
      </Link>

      <div className="bg-card border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          
          {/* Left Column: Visual Placeholder */}
          <div className="lg:col-span-2 bg-slate-800/40 p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-700/50 min-h-[300px]">
            <Package className="w-32 h-32 text-slate-600 mb-6" />
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <FileDigit className="w-4 h-4" />
              <span>Digital Asset</span>
            </div>
          </div>

          {/* Right Column: Product Information */}
          <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                {product.title}
              </h1>
              {product.is_active && (
                <span className="shrink-0 inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  Active
                </span>
              )}
            </div>

            <div className="flex items-center text-primary font-bold text-3xl mb-8">
              <Tag className="w-6 h-6 mr-2 opacity-80" />
              ₹{product.price.toFixed(2)}
            </div>

            <div className="prose prose-invert max-w-none mb-10">
              <h3 className="text-lg font-semibold text-white mb-2 border-b border-slate-800 pb-2">
                About this product
              </h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {product.description || "No detailed description is available for this digital product."}
              </p>
            </div>

            {/* Additional Metadata */}
            <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800/50">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Listed On</p>
                  <p className="text-sm text-slate-300">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Product ID</p>
                  <p className="text-sm text-slate-300">#{product.id.toString().padStart(6, '0')}</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

