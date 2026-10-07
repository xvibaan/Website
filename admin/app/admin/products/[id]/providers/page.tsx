"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import {
  ArrowLeft,
  Server,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Save,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export default function ProductProvidersPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    providerId: "",
    variantId: "", // empty means product-level
    providerProductId: "",
    providerVariantId: "",
    priority: 1,
    isEnabled: true,
    isMaintenance: false,
    costPrice: "0.00",
    currency: "INR",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, provsRes, offersRes] = await Promise.all([
        adminApi.getProduct(productId),
        adminApi.getProviders(),
        adminApi.getProductProviderOffers(productId)
      ]);
      if (prodRes?.product) setProduct(prodRes.product);
      if (provsRes?.providers) setProviders(provsRes.providers);
      if (offersRes?.offers) {
        // sort by priority asc
        setOffers(offersRes.offers.sort((a, b) => a.priority - b.priority));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (!formData.providerId) {
        alert("Please select a provider");
        return;
      }
      
      const payload = {
        productId,
        ...formData,
        variantId: formData.variantId ? formData.variantId : null,
      };

      if (editingOfferId) {
        await adminApi.updateProductProviderOffer(editingOfferId, payload);
      } else {
        await adminApi.createProductProviderOffer(payload);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      alert("Error saving offer: " + errMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider mapping?")) return;
    try {
      await adminApi.deleteProductProviderOffer(id);
      fetchData();
    } catch (err: any) {
      alert("Error deleting: " + (err.message || "Unknown error"));
    }
  };

  const openNewModal = () => {
    setEditingOfferId(null);
    setFormData({
      providerId: "",
      variantId: "",
      providerProductId: "",
      providerVariantId: "",
      priority: offers.length > 0 ? Math.max(...offers.map(o => o.priority)) + 1 : 1,
      isEnabled: true,
      isMaintenance: false,
      costPrice: "0.00",
      currency: "INR",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (offer: any) => {
    setEditingOfferId(offer.id);
    setFormData({
      providerId: offer.providerId,
      variantId: offer.variantId || "",
      providerProductId: offer.providerProductId || "",
      providerVariantId: offer.providerVariantId || "",
      priority: offer.priority,
      isEnabled: offer.isEnabled,
      isMaintenance: offer.isMaintenance,
      costPrice: offer.costPrice,
      currency: offer.currency,
    });
    setIsModalOpen(true);
  };

  const changePriority = async (offer: any, direction: number) => {
    try {
      await adminApi.updateProductProviderOffer(offer.id, {
        priority: offer.priority + direction
      });
      fetchData();
    } catch (err: any) {
      alert("Error updating priority: " + (err.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href={`/admin/products/${productId}`} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-500" />
            Provider Failover Configuration
          </h1>
          <p className="text-zinc-400">{product?.name || "Product"} - Route orders to multiple providers safely</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Configured Providers</h2>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Provider Mapping
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Priority</th>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Marketplace Variant</th>
                <th className="px-6 py-4 font-medium">Remote Config (PID / VID)</th>
                <th className="px-6 py-4 font-medium">Cost Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    No provider mappings configured. This product cannot be fulfilled automatically.
                  </td>
                </tr>
              ) : (
                offers.map((offer, index) => {
                  const providerDef = providers.find(p => p.id === offer.providerId);
                  return (
                    <tr key={offer.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-zinc-800 text-zinc-300 w-6 h-6 rounded flex items-center justify-center text-xs font-mono">
                            {offer.priority}
                          </span>
                          <div className="flex flex-col">
                            <button onClick={() => changePriority(offer, -1)} className="text-zinc-500 hover:text-white"><ArrowUp className="h-3 w-3" /></button>
                            <button onClick={() => changePriority(offer, 1)} className="text-zinc-500 hover:text-white"><ArrowDown className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{providerDef?.name || "Unknown"}</div>
                        <div className="text-xs text-zinc-500">{providerDef?.code || offer.providerId}</div>
                      </td>
                      <td className="px-6 py-4">
                        {offer.variantId ? (
                          <div className="text-sm font-medium text-blue-400">
                            {product?.variants?.find((v: any) => v.id === offer.variantId)?.name || 'Unknown Variant'}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-zinc-400">Product-level (All)</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-300 font-mono">
                          PID: {offer.providerProductId || "-"}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          VID: {offer.providerVariantId || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {offer.costPrice} {offer.currency}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {offer.isEnabled ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                              <Check className="h-3 w-3" /> Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">
                              <X className="h-3 w-3" /> Disabled
                            </span>
                          )}
                          {offer.isMaintenance && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                              <AlertCircle className="h-3 w-3" /> Maintenance
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(offer)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                {editingOfferId ? "Edit Provider Mapping" : "Add Provider Mapping"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Provider</label>
                <select
                  value={formData.providerId}
                  onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Select a provider...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Marketplace Variant Mapping</label>
                <select
                  value={formData.variantId}
                  onChange={(e) => setFormData({ ...formData, variantId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Product-level (Applies to all variants)</option>
                  {product?.variants?.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">Select an explicit variant or leave as Product-level for fallback mapping.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Lower number = attempted first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cost Price</label>
                  <input
                    type="text"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Remote Provider Product ID</label>
                  <input
                    type="text"
                    value={formData.providerProductId}
                    onChange={(e) => setFormData({ ...formData, providerProductId: e.target.value })}
                    placeholder="e.g. 12345"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Remote Provider Variant ID</label>
                  <input
                    type="text"
                    value={formData.providerVariantId}
                    onChange={(e) => setFormData({ ...formData, providerVariantId: e.target.value })}
                    placeholder="e.g. var-6789"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-zinc-900"
                  />
                  Enabled for Routing
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMaintenance}
                    onChange={(e) => setFormData({ ...formData, isMaintenance: e.target.checked })}
                    className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                  />
                  Maintenance Mode
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                {editingOfferId ? "Update Mapping" : "Create Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
