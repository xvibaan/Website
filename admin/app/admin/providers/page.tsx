"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Play,
  History,
  Zap,
  Lock,
  Package,
  ShoppingBag,
  Wrench,
  ChevronDown,
} from "lucide-react";

interface ProviderItem {
  id: string;
  code: string;
  name: string;
  adapterType: string;
  baseUrl: string | null;
  state: string;
  healthStatus: string;
  isCredentialsConfigured: boolean;
  lastHealthCheckAt: string | null;
  lastSuccessfulRequestAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HealthLogItem {
  id: string;
  providerId: string;
  status: string;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

interface SyncedCatalogItem {
  providerProductId: string;
  name: string;
  description: string;
  category: string;
  costPrice: string;
  currency: string;
  inStock: boolean;
  isMapped: boolean;
  mappedProduct: { id: string; name: string; providerProductId: string } | null;
}

interface ProviderOrderItem {
  orderItemId: string;
  orderId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  priceAtPurchase: string;
  providerCostSnapshot: string | null;
  providerProductId: string | null;
  quantity: number;
  fulfillmentStatus: string;
  createdAt: string;
  orderTotalAmount: string;
  orderStatus: string;
  orderReference: string;
  userId: string;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Testing / Health Action State
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; message: string; latencyMs?: number } | null>(null);

  // Health Logs Modal
  const [selectedProviderLogs, setSelectedProviderLogs] = useState<ProviderItem | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Catalog Sync Modal State
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [catalogModalData, setCatalogModalData] = useState<{
    provider: ProviderItem;
    items: SyncedCatalogItem[];
    syncedAt: string;
  } | null>(null);

  // Provider Orders Modal State
  const [ordersLoadingId, setOrdersLoadingId] = useState<string | null>(null);
  const [ordersModalData, setOrdersModalData] = useState<{
    provider: ProviderItem;
    orders: ProviderOrderItem[];
  } | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getProviders();
      if (res && res.providers) {
        setProviders(res.providers);
      }
    } catch (err: any) {
      console.error("Providers fetch error:", err);
      setError(err?.message || "Failed to load provider registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = async (provider: ProviderItem) => {
    setActiveTestingId(provider.id);
    setError(null);
    setTestResult(null);
    try {
      const res = await adminApi.testProviderConnection(provider.id);
      setTestResult({
        id: provider.id,
        message: res.message || "Connection verified successfully.",
        latencyMs: res.latencyMs,
      });
      fetchProviders();
    } catch (err: any) {
      setError(`Connection test failed for ${provider.name}: ${err?.message || "Timeout"}`);
    } finally {
      setActiveTestingId(null);
    }
  };

  const handleRunHealthCheck = async (provider: ProviderItem) => {
    setActiveTestingId(provider.id);
    setError(null);
    try {
      const res = await adminApi.runProviderHealthCheck(provider.id);
      setActionSuccess(`Health check completed for ${provider.name}. Status: ${res.healthStatus}`);
      fetchProviders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(`Health check failed for ${provider.name}: ${err?.message}`);
    } finally {
      setActiveTestingId(null);
    }
  };

  const handleChangeState = async (provider: ProviderItem, newState: "ACTIVE" | "DISABLED" | "MAINTENANCE") => {
    try {
      await adminApi.updateProviderState(provider.id, newState, `Admin state change to ${newState}`);
      setActionSuccess(`Provider ${provider.name} set to ${newState}.`);
      fetchProviders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(`Failed to update provider state: ${err?.message}`);
    }
  };

  const handleSyncCatalog = async (provider: ProviderItem) => {
    setSyncingId(provider.id);
    setError(null);
    try {
      const res = await adminApi.syncProviderCatalog(provider.id);
      setActionSuccess(`Catalog synchronized: ${res.totalItems} items received (${res.mappedItemsCount} mapped).`);
      setCatalogModalData({
        provider,
        items: res.items,
        syncedAt: res.syncedAt,
      });
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(`Catalog sync failed for ${provider.name}: ${err?.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleViewOrders = async (provider: ProviderItem) => {
    setOrdersLoadingId(provider.id);
    setError(null);
    try {
      const res = await adminApi.getProviderOrders(provider.id);
      setOrdersModalData({
        provider,
        orders: res.orders,
      });
    } catch (err: any) {
      setError(`Failed to fetch orders for ${provider.name}: ${err?.message}`);
    } finally {
      setOrdersLoadingId(null);
    }
  };

  const openHealthLogs = async (provider: ProviderItem) => {
    setSelectedProviderLogs(provider);
    setHealthLogs([]);
    setLoadingLogs(true);
    try {
      const res = await adminApi.getProviderHealthLogs(provider.id, 25);
      if (res && res.logs) {
        setHealthLogs(res.logs);
      }
    } catch (err: any) {
      setError("Failed to retrieve provider health logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Server className="w-6 h-6 text-[#00c2ff]" />
            <span>Multi-Provider Infrastructure</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative adapter registry, credential encryption status, catalog sync, and live health monitors
          </p>
        </div>

        <button
          onClick={fetchProviders}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Test Result Callout */}
      {testResult && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <Zap className="w-4 h-4 text-[#00c2ff]" />
            <span>{testResult.message}</span>
          </div>
          {testResult.latencyMs !== undefined && (
            <span className="font-mono text-[11px] bg-blue-500/20 px-2 py-0.5 rounded">
              Latency: {testResult.latencyMs}ms
            </span>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Provider exception</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Provider Registry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-gray-500 bg-[#0b0e17] border border-white/10 rounded-2xl">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#00c2ff]" />
              <span>Checking provider registry...</span>
            </div>
          </div>
        ) : providers.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-gray-500 bg-[#0b0e17] border border-white/10 rounded-2xl">
            No upstream provider adapters registered in database.
          </div>
        ) : (
          providers.map((p) => (
            <div
              key={p.id}
              className="bg-[#0b0e17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                      {p.code}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono block mt-0.5">
                    Type: {p.adapterType}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Health Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono ${
                      p.healthStatus === "HEALTHY"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : p.healthStatus === "UNHEALTHY"
                        ? "bg-red-500/10 border border-red-500/20 text-red-400"
                        : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    }`}
                  >
                    {p.healthStatus === "HEALTHY" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>{p.healthStatus}</span>
                  </span>

                  {/* 3-State Picker */}
                  <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => handleChangeState(p, "ACTIVE")}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        p.state === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                          : "text-gray-400 hover:text-white"
                      }`}
                      title="Enable Provider"
                    >
                      Active
                    </button>
                    <button
                      onClick={() => handleChangeState(p, "MAINTENANCE")}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        p.state === "MAINTENANCE"
                          ? "bg-amber-500/20 text-amber-300 font-semibold"
                          : "text-gray-400 hover:text-white"
                      }`}
                      title="Put Provider in Maintenance Mode"
                    >
                      Maint
                    </button>
                    <button
                      onClick={() => handleChangeState(p, "DISABLED")}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        p.state === "DISABLED"
                          ? "bg-red-500/20 text-red-400 font-semibold"
                          : "text-gray-400 hover:text-white"
                      }`}
                      title="Disable Provider"
                    >
                      Disabled
                    </button>
                  </div>
                </div>
              </div>

              {/* Secrets Protection & Status Info */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Credentials</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-0.5">
                    <Lock className="w-3 h-3" />
                    <span>{p.isCredentialsConfigured ? "Encrypted & Safe" : "Not Set"}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Last Check</span>
                  <span className="text-gray-300 block mt-0.5 truncate">
                    {p.lastHealthCheckAt ? new Date(p.lastHealthCheckAt).toLocaleTimeString() : "Never"}
                  </span>
                </div>
              </div>

              {/* Error Message if Unhealthy */}
              {p.lastErrorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono">
                  <span className="font-bold block mb-0.5">Last Upstream Error:</span>
                  <span className="break-all">{p.lastErrorMessage}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openHealthLogs(p)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Logs</span>
                  </button>

                  <button
                    onClick={() => handleViewOrders(p)}
                    disabled={ordersLoadingId === p.id}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#00c2ff] transition-colors"
                  >
                    {ordersLoadingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-3.5 h-3.5" />
                    )}
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => handleSyncCatalog(p)}
                    disabled={syncingId === p.id}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {syncingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>Sync Catalog</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunHealthCheck(p)}
                    disabled={activeTestingId === p.id}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
                  >
                    Health
                  </button>

                  <button
                    onClick={() => handleTestConnection(p)}
                    disabled={activeTestingId === p.id}
                    className="px-3 py-1 rounded-lg bg-[#00c2ff]/10 hover:bg-[#00c2ff]/20 border border-[#00c2ff]/30 text-[#00c2ff] text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    {activeTestingId === p.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>Test Ping</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Health Logs Modal */}
      {selectedProviderLogs && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-2xl w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00c2ff]" />
                <h3 className="text-base font-bold text-white">
                  Health Check Log Journal — {selectedProviderLogs.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProviderLogs(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Checked At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00c2ff] mx-auto" />
                      </td>
                    </tr>
                  ) : healthLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No health logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    healthLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                          {new Date(log.checkedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.status === "HEALTHY"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white">
                          {log.latencyMs !== null ? `${log.latencyMs}ms` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 truncate max-w-xs">
                          {log.errorMessage || "Healthy"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedProviderLogs(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Sync Modal */}
      {catalogModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-3xl w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Normalized Catalog Sync — {catalogModalData.provider.name}
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Synced at {new Date(catalogModalData.syncedAt).toLocaleTimeString()} · Total: {catalogModalData.items.length} items
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCatalogModalData(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Provider SKU</th>
                    <th className="py-2.5 px-3">Title & Category</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Stock</th>
                    <th className="py-2.5 px-3">Marketplace Mapping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {catalogModalData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No catalog items returned by adapter.
                      </td>
                    </tr>
                  ) : (
                    catalogModalData.items.map((item) => (
                      <tr key={item.providerProductId} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-[#00c2ff] text-[11px]">
                          {item.providerProductId}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white block">{item.name}</span>
                          <span className="text-[10px] text-gray-400">{item.category}</span>
                        </td>
                        <td className="py-2.5 px-3 text-white">
                          ₹{item.costPrice} {item.currency}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              item.inStock
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {item.inStock ? "IN STOCK" : "OUT"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isMapped ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{item.mappedProduct?.name || "Mapped"}</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[10px]">Unmapped</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setCatalogModalData(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Orders Modal */}
      {ordersModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-3xl w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00c2ff]" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Provider Orders Journal — {ordersModalData.provider.name}
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Total orders fulfilled: {ordersModalData.orders.length}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOrdersModalData(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/70 border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product / Variant</th>
                    <th className="py-2.5 px-3">Selling Price</th>
                    <th className="py-2.5 px-3">Provider Cost</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {ordersModalData.orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No orders have been routed to this provider yet.
                      </td>
                    </tr>
                  ) : (
                    ordersModalData.orders.map((order) => (
                      <tr key={order.orderItemId} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-[#00c2ff] text-[11px] font-bold">
                          {order.orderReference}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white block">{order.productNameSnapshot}</span>
                          {order.variantNameSnapshot && (
                            <span className="text-[10px] text-gray-400">{order.variantNameSnapshot}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          ₹{order.priceAtPurchase}
                        </td>
                        <td className="py-2.5 px-3 text-gray-300">
                          {order.providerCostSnapshot ? `₹${order.providerCostSnapshot}` : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              order.fulfillmentStatus === "FULFILLED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : order.fulfillmentStatus === "FAILED"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {order.fulfillmentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setOrdersModalData(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
