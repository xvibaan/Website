"use client";

import React, { useEffect, useState } from "react";
import { Product } from "@/components/ProductCard";
import { ShieldAlert, Plus, Edit, Archive, Check } from "lucide-react";

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
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
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/products/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };

  const handleToggleArchive = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !product.isArchived }),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to toggle archive:", error);
    }
  };

  const handleAddNew = async () => {
    const newProduct = {
      title: "New Mod",
      basePrice: 1000,
      margin: 200,
      features: ["Feature 1", "Feature 2"],
      setupLink: "",
      feedbackLink: "",
      isArchived: false,
    };
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to create product:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 text-white font-mono">
      <div className="mb-12 border-b border-primary/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-widest flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-secondary" />
            ADMIN PANEL
          </h1>
          <p className="mt-2 text-sm text-primary/70 uppercase tracking-widest">
            Manage inventory and pricing margins
          </p>
        </div>
        <button onClick={handleAddNew} className="cyber-btn flex items-center gap-2 text-sm !py-2">
          <Plus className="w-4 h-4" /> ADD NEW MODULE
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-primary/50 py-10 animate-pulse">LOADING INVENTORY...</div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className={`glass-card p-4 flex flex-col gap-4 ${product.isArchived ? 'opacity-60 grayscale' : ''}`}>
              {editingId === product.id ? (
                // Edit Mode
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-primary/70 mb-1 block">TITLE</label>
                    <input 
                      type="text" 
                      className="cyber-input !py-1.5" 
                      value={editForm.title || ""} 
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-primary/70 mb-1 block">MARGIN (₹)</label>
                    <input 
                      type="number" 
                      className="cyber-input !py-1.5" 
                      value={editForm.margin || 0} 
                      onChange={(e) => setEditForm({...editForm, margin: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-primary/70 mb-1 block">BASE PRICE (₹)</label>
                    <input 
                      type="number" 
                      className="cyber-input !py-1.5" 
                      value={editForm.basePrice || 0} 
                      onChange={(e) => setEditForm({...editForm, basePrice: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-primary/70 mb-1 block">SETUP LINK</label>
                    <input 
                      type="text" 
                      className="cyber-input !py-1.5" 
                      value={editForm.setupLink || ""} 
                      onChange={(e) => setEditForm({...editForm, setupLink: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-primary/70 mb-1 block">FEEDBACK LINK</label>
                    <input 
                      type="text" 
                      className="cyber-input !py-1.5" 
                      value={editForm.feedbackLink || ""} 
                      onChange={(e) => setEditForm({...editForm, feedbackLink: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-span-full flex gap-3 mt-2">
                    <button onClick={handleSaveEdit} className="cyber-btn !py-2 text-xs flex gap-1 items-center">
                      <Check className="w-3 h-3" /> SAVE
                    </button>
                    <button onClick={handleCancelEdit} className="cyber-btn-outline !py-2 text-xs text-secondary border-secondary hover:bg-secondary/10">
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                      {product.title}
                      {product.isArchived && <span className="badge-archived scale-75 origin-left">ARCHIVED</span>}
                    </h3>
                    <div className="text-xs text-gray-400 mt-1 space-x-4">
                      <span>BASE: ₹{product.basePrice}</span>
                      <span className="text-primary font-bold">MARGIN: ₹{product.margin}</span>
                      <span>FINAL: ₹{product.basePrice + product.margin}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleArchive(product)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${
                        product.isArchived 
                          ? 'border-green-500/50 text-green-500 hover:bg-green-500/10' 
                          : 'border-secondary/50 text-secondary hover:bg-secondary/10'
                      }`}
                    >
                      {product.isArchived ? 'UNLIST / RESTORE' : 'ARCHIVE / HIDE'}
                    </button>
                    <button 
                      onClick={() => handleEditClick(product)}
                      className="p-1.5 border border-primary/30 text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {products.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-10">NO INVENTORY FOUND</div>
          )}
        </div>
      )}
    </div>
  );
}
