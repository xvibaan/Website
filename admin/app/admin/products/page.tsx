"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import {
  Package,
  Plus,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Filter,
  Layers,
  Server,
  IndianRupee,
  ExternalLink,
} from "lucide-react";

interface ProductItem {
  id: string;
  categoryId: string;
  providerId: string | null;
  providerProductId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sellingPrice: string;
  costPrice: string | null;
  currency: string;
  status: string;
  specs: any;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  providerName?: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ProviderOption {
  id: string;
  name: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchDependenciesAndProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsRes, catsRes, provsRes] = await Promise.all([
        adminApi.getProducts({
          search: search.trim() || undefined,
          categoryId: categoryFilter || undefined,
          status: statusFilter || undefined,
        }),
        adminApi.getCategories(),
        adminApi.getProviders(),
      ]);

      if (prodsRes && prodsRes.products) setProducts(prodsRes.products);
      if (catsRes && catsRes.categories) {
        setCategories(catsRes.categories.map((c) => ({ id: c.id, name: c.name })));
      }
      if (provsRes && provsRes.providers) {
        setProviders(provsRes.providers.map((p) => ({ id: p.id, name: p.name })));
      }
    } catch (err: any) {
      console.error("Products fetch error:", err);
      setError(err?.message || "Failed to load products from Master Backend.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchDependenciesAndProducts();
  }, [fetchDependenciesAndProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDependenciesAndProducts();
  };

  const handleToggleStatus = async (prod: ProductItem) => {
    const nextStatus = prod.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await adminApi.updateProductStatus(prod.id, nextStatus);
      setActionSuccess(`Product '${prod.name}' set to ${nextStatus}.`);
      fetchDependenciesAndProducts();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update product status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#00c2ff]" />
            <span>Product Catalog</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative hosting catalog, real tiered variants, and upstream provider mapping
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDependenciesAndProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
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
            <span className="font-semibold block mb-0.5">Product catalog error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0b0e17] border border-white/10 p-3 rounded-2xl">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or slug..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00c2ff]/50"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer py-1"
            >
              <option value="" className="bg-[#0b0e17] text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0b0e17] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-xl px-2.5 py-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer py-1"
            >
              <option value="" className="bg-[#0b0e17] text-white">All Statuses</option>
              <option value="ACTIVE" className="bg-[#0b0e17] text-emerald-400">ACTIVE</option>
              <option value="DISABLED" className="bg-[#0b0e17] text-gray-400">DISABLED</option>
              <option value="OUT_OF_STOCK" className="bg-[#0b0e17] text-amber-400">OUT_OF_STOCK</option>
              <option value="DISCONTINUED" className="bg-[#0b0e17] text-red-400">DISCONTINUED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] font-mono uppercase text-gray-400">
              <tr>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Cost Price (Admin Only)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00c2ff]" />
                      <span>Loading products from PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No products found. Click &quot;Add Product&quot; to configure marketplace offerings.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <Link href={`/admin/products/${prod.id}`} className="group block">
                        <span className="font-semibold text-white group-hover:text-[#00c2ff] transition-colors block">
                          {prod.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#00c2ff] block">
                          {prod.slug}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300">
                      {prod.categoryName || categories.find((c) => c.id === prod.categoryId)?.name || "Uncategorized"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {prod.providerName || (prod.providerId ? "Configured" : "None (Direct)")}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-emerald-400 font-bold">
                        ₹{Number(prod.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {prod.costPrice ? (
                        <span className="text-amber-400 font-semibold">
                          ₹{Number(prod.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(prod)}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono transition-all ${
                          prod.status === "ACTIVE"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                        }`}
                        title="Click to toggle status"
                      >
                        {prod.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{prod.status}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs transition-all"
                          title="Manage Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
