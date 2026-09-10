"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, AlertCircle, Loader2, Tag } from "lucide-react";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        
        // Fetch products from the public endpoint
        const response = await fetch(`${apiUrl}/products/`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch products from the server.");
        }
        
        const data = await response.json();
        setProducts(data);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while loading the catalog.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-slate-400 font-medium">Loading marketplace catalog...</p>
      </div>
    );
  }

  // 2. API Error State
  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="bg-card p-8 rounded-2xl border border-red-500/30 text-center max-w-md shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // 3. Success State (with potential empty state handling)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Marketplace Catalog</h1>
        <p className="text-slate-400">Discover and explore premium digital products.</p>
      </div>

      {products.length === 0 ? (
        // Empty State
        <div className="bg-card border border-slate-700 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No products available</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            Our catalog is currently empty. New digital products will be added soon. Please check back later!
          </p>
        </div>
      ) : (
        // Grid State
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-card border border-slate-700 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group flex flex-col shadow-sm hover:shadow-primary/5"
            >
              {/* Product Image Placeholder */}
              <div className="aspect-[4/3] bg-slate-800/40 flex items-center justify-center border-b border-slate-700/50">
                <Package className="w-12 h-12 text-slate-600 group-hover:text-primary/60 transition-colors duration-300" />
              </div>
              
              {/* Product Details */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="text-lg font-bold text-white line-clamp-1" title={product.title}>
                    {product.title}
                  </h3>
                  {product.is_active && (
                    <span className="shrink-0 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase tracking-wider font-bold rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                
                <p className="text-slate-400 text-sm line-clamp-2 mb-6 flex-grow">
                  {product.description || "No description available for this digital product."}
                </p>
                
                {/* Price & Action */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                  <div className="flex items-center text-primary font-bold text-lg">
                    <Tag className="w-4 h-4 mr-1.5 opacity-70" />
                    ₹{product.price.toFixed(2)}
                  </div>
                  
                  <Link 
                    href={`/products/${product.id}`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors border border-slate-700"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
