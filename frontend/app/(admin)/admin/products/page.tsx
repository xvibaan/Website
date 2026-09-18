"use client";

import React, { useState, useEffect } from "react";
import { Package, Edit2, AlertTriangle } from "lucide-react";
import { Product } from "@/components/ProductCard";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="space-y-8">
      <div className="border-b border-red-500/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <Package className="w-8 h-8 text-red-500" />
            MODULE MANAGEMENT
          </h1>
        </div>
        <button className="bg-red-500 hover:bg-red-600 text-black font-bold font-mono px-4 py-2 rounded text-sm transition-colors">
          + DEPLOY NEW MODULE
        </button>
      </div>

      <div className="bg-black/50 backdrop-blur-md border border-red-500/20 rounded-xl overflow-hidden">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-white/5 border-b border-red-500/20 text-gray-400">
            <tr>
              <th className="p-4 font-normal">MODULE NAME</th>
              <th className="p-4 font-normal">GAME</th>
              <th className="p-4 font-normal">STATUS</th>
              <th className="p-4 font-normal">PRICE (₹)</th>
              <th className="p-4 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 animate-pulse">LOADING...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">NO MODULES DEPLOYED.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-bold">{p.title} {p.isArchived && <span className="text-xs text-red-500 ml-2">(ARCHIVED)</span>}</td>
                  <td className="p-4 text-gray-300">{p.gameName || 'N/A'}</td>
                  <td className="p-4">
                    <select 
                      value={p.cheatStatus || 'UNDETECTED'} 
                      onChange={() => {}} // dummy onChange for mock
                      className={`bg-transparent border rounded text-xs p-1 font-bold ${
                        p.cheatStatus === 'UPDATING' ? 'text-yellow-500 border-yellow-500/50' : 
                        p.cheatStatus === 'RISK' ? 'text-red-500 border-red-500/50' : 
                        'text-green-500 border-green-500/50'
                      }`}
                    >
                      <option className="bg-black text-green-500">UNDETECTED</option>
                      <option className="bg-black text-yellow-500">UPDATING</option>
                      <option className="bg-black text-red-500">RISK</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-300">{p.basePrice + p.margin}</td>
                  <td className="p-4 text-right space-x-3">
                    <button className="text-gray-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4 inline" /></button>
                    <button className="text-red-500/70 hover:text-red-500 transition-colors"><AlertTriangle className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
