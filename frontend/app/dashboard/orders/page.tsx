"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Eye,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  CreditCard,
  RefreshCw,
  Receipt,
  Download,
  AlertCircle,
  PackageOpen,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

interface OrderItem {
  id: number;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  price_at_purchase: number;
  face_value?: number;
  discount_percent?: number;
  category?: string;
  product_key?: {
    key_value: string;
  };
}

interface Order {
  id: number;
  user_id?: number;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  delivery_status?: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await api.get<Order[]>("/v1/orders/");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load order history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleExportCSV = () => {
    const listToExport = filteredOrders.length > 0 ? filteredOrders : orders;
    if (listToExport.length === 0) return;

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Order ID",
      "Date",
      "Time (UTC)",
      "Status",
      "Total Amount (INR)",
      "Items Count",
      "Products",
      "Variants",
      "Digital Codes / License Keys",
    ];

    const rows = listToExport.map((order) => {
      const dateObj = new Date(order.created_at);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const formattedTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const productNames = (order.items || [])
        .map((i) => i.product_name_snapshot || "Item")
        .join("; ");
      const variantNames = (order.items || [])
        .map((i) => i.variant_name_snapshot || "Standard")
        .join("; ");
      const keys = (order.items || [])
        .map((i) => i.product_key?.key_value)
        .filter(Boolean)
        .join("; ") || "N/A";

      return [
        `HM-${order.id}`,
        formattedDate,
        formattedTime,
        order.status,
        Number(order.total_amount || 0).toFixed(2),
        (order.items || []).length,
        productNames,
        variantNames,
        keys,
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `host_marketplace_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    const list = orders.filter((order) => {
      // Status filter
      if (statusFilter !== "ALL" && order.status.toUpperCase() !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderIdMatch = `hm-${order.id}`.includes(q) || `${order.id}`.includes(q);
        const itemMatch = order.items.some(
          (item) =>
            item.product_name_snapshot?.toLowerCase().includes(q) ||
            item.variant_name_snapshot?.toLowerCase().includes(q) ||
            item.product_key?.key_value?.toLowerCase().includes(q)
        );
        return orderIdMatch || itemMatch;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "DATE_DESC") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "DATE_ASC") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "AMOUNT_DESC") {
        return b.total_amount - a.total_amount;
      }
      if (sortBy === "AMOUNT_ASC") {
        return a.total_amount - b.total_amount;
      }
      return 0;
    });
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Aggregate metrics
  const totalOrdersCount = orders.length;
  const completedOrdersCount = orders.filter((o) => o.status.toUpperCase() === "COMPLETED").length;
  const totalSpent = orders
    .filter((o) => o.status.toUpperCase() === "COMPLETED")
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const activeKeysCount = orders.reduce((sum, o) => {
    if (o.status.toUpperCase() === "COMPLETED") {
      return sum + o.items.filter((i) => !!i.product_key?.key_value).length;
    }
    return sum;
  }, 0);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
        </span>
      );
    }
    if (s === "PENDING" || s === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
          <Clock className="w-3.5 h-3.5" /> {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
        <XCircle className="w-3.5 h-3.5" /> {s || "FAILED"}
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 px-3 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2 min-h-[40px] text-xs font-mono text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Dashboard</span>
          </Link>

          <Link
            href="/#modules-section"
            className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
            <span>Explore Marketplace</span>
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-[0_0_20px_rgba(0,194,255,0.2)]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-primary mb-1">
                <Sparkles className="w-3 h-3" />
                <span>CUSTOMER PURCHASES REGISTRY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Order History
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Comprehensive record of all digital software licenses and activation orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              disabled={isLoading || orders.length === 0}
              className="px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-primary hover:text-white transition-all min-h-[42px] flex items-center gap-2 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,194,255,0.15)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              title="Download order history as CSV for personal accounting"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export to CSV</span>
            </button>

            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors min-h-[42px] flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
              title="Refresh order history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-gray-400 text-xs font-mono uppercase mb-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span>Total Orders</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {isLoading ? <Skeleton className="h-7 w-16 bg-white/10" /> : totalOrdersCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">All time purchase attempts</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-mono uppercase mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {isLoading ? <Skeleton className="h-7 w-16 bg-white/10" /> : completedOrdersCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">100% Fulfilled & Delivered</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-amber-400 text-xs font-mono uppercase mb-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Total Invested</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {isLoading ? (
                <Skeleton className="h-7 w-24 bg-white/10" />
              ) : (
                `₹${totalSpent.toFixed(2)}`
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Net completed volume</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-purple-400 text-xs font-mono uppercase mb-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Active Licenses</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
              {isLoading ? <Skeleton className="h-7 w-16 bg-white/10" /> : activeKeysCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Delivered digital serials</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#0c0e17]/60 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, product, or key..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Status and Sort Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
              {["ALL", "COMPLETED", "PENDING", "FAILED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    statusFilter === status
                      ? "bg-primary text-black font-bold shadow-[0_0_10px_rgba(0,194,255,0.2)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-gray-300 focus:outline-none focus:border-primary/50 shrink-0"
            >
              <option value="DATE_DESC">Newest First</option>
              <option value="DATE_ASC">Oldest First</option>
              <option value="AMOUNT_DESC">Price High-Low</option>
              <option value="AMOUNT_ASC">Price Low-High</option>
            </select>
          </div>
        </div>

        {/* Main Orders Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-[#0c0e17]/60 p-12 text-center flex flex-col items-center justify-center">
            <PackageOpen className="w-14 h-14 text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Orders Found</h3>
            <p className="text-gray-400 text-xs max-w-sm mb-5">
              {searchQuery || statusFilter !== "ALL"
                ? "No previous orders match your applied filters. Try adjusting your query."
                : "You haven't placed any marketplace orders yet. Browse our catalog of modules and serial keys to get started."}
            </p>
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono text-white transition-colors"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                href="/#modules-section"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(0,194,255,0.2)]"
              >
                Browse Catalog
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-5">Order ID & Item</th>
                    <th className="py-4 px-4">Date & Time</th>
                    <th className="py-4 px-4">Amount</th>
                    <th className="py-4 px-4">Payment & Status</th>
                    <th className="py-4 px-4">Delivered License</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {filteredOrders.map((order) => {
                    const firstItem = order.items[0];
                    const keyValue = firstItem?.product_key?.key_value;
                    const isRedeemCode =
                      (firstItem?.category && firstItem.category.toLowerCase().includes("redeem")) ||
                      (firstItem?.product_name_snapshot &&
                        (firstItem.product_name_snapshot.toLowerCase().includes("voucher") ||
                          firstItem.product_name_snapshot.toLowerCase().includes("redeem") ||
                          firstItem.product_name_snapshot.toLowerCase().includes("code")));

                    const faceVal = firstItem?.face_value;
                    const paidPrice = firstItem?.price_at_purchase ?? order.total_amount;
                    const discountPct =
                      firstItem?.discount_percent ??
                      (faceVal && paidPrice && faceVal > paidPrice
                        ? Math.round(((faceVal - paidPrice) / faceVal) * 100)
                        : null);

                    return (
                      <tr key={order.id} className="hover:bg-white/[0.03] transition-colors group">
                        {/* Order ID & Item */}
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-white font-mono group-hover:text-primary transition-colors">
                            #HM-{order.id}
                          </div>
                          <div className="text-xs text-gray-300 font-medium mt-0.5">
                            {firstItem?.product_name_snapshot || "Digital Marketplace Item"}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded font-semibold">
                              {firstItem?.variant_name_snapshot || "Standard"}
                            </span>
                            {discountPct && discountPct > 0 ? (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                {discountPct}% OFF
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 font-mono text-gray-400">
                          <div>
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Pricing / Amount */}
                        <td className="py-4 px-4 font-mono">
                          {faceVal && faceVal > paidPrice && (
                            <div className="text-[10px] text-gray-400 line-through">
                              ₹{Number(faceVal).toFixed(2)}
                            </div>
                          )}
                          <div className="font-bold text-white text-sm">
                            ₹{Number(order.total_amount).toFixed(2)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(order.status)}
                            <div className="text-[10px] text-gray-400 font-mono">
                              Payment: Successful
                            </div>
                          </div>
                        </td>

                        {/* Delivered Code / License Key */}
                        <td className="py-4 px-4">
                          {order.status === "COMPLETED" && keyValue ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/10">
                              <KeyRound className="w-3 h-3 text-primary shrink-0" />
                              <code className="text-xs font-mono text-white select-all truncate max-w-[140px] font-bold">
                                {keyValue}
                              </code>
                              <button
                                onClick={() => handleCopy(keyValue)}
                                className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                                title={isRedeemCode ? "Copy Redeem Code" : "Copy Key"}
                                aria-label="Copy Code"
                              >
                                {copiedKey === keyValue ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-mono italic">
                              {order.status === "COMPLETED"
                                ? "Fulfilled"
                                : "Pending Fulfillment"}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => openOrderDetails(order)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all inline-flex items-center gap-1 min-h-[36px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< lg screens) */}
            <div className="lg:hidden space-y-3.5">
              {filteredOrders.map((order) => {
                const firstItem = order.items[0];
                const keyValue = firstItem?.product_key?.key_value;
                const isRedeemCode =
                  (firstItem?.category && firstItem.category.toLowerCase().includes("redeem")) ||
                  (firstItem?.product_name_snapshot &&
                    (firstItem.product_name_snapshot.toLowerCase().includes("voucher") ||
                      firstItem.product_name_snapshot.toLowerCase().includes("redeem") ||
                      firstItem.product_name_snapshot.toLowerCase().includes("code")));

                const faceVal = firstItem?.face_value;
                const paidPrice = firstItem?.price_at_purchase ?? order.total_amount;
                const discountPct =
                  firstItem?.discount_percent ??
                  (faceVal && paidPrice && faceVal > paidPrice
                    ? Math.round(((faceVal - paidPrice) / faceVal) * 100)
                    : null);

                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <span className="font-extrabold text-white text-sm font-mono block">
                          #HM-{order.id}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(order.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm">
                        {firstItem?.product_name_snapshot || "Digital Marketplace Item"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-semibold">
                          {firstItem?.variant_name_snapshot || "Standard Edition"}
                        </span>
                        {discountPct && discountPct > 0 ? (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                            {discountPct}% OFF
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400 font-mono">
                        {faceVal && faceVal > paidPrice ? (
                          <span>
                            Value: <span className="line-through">₹{Number(faceVal).toFixed(2)}</span>
                          </span>
                        ) : (
                          "Total Paid:"
                        )}
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        Paid: ₹{Number(order.total_amount).toFixed(2)}
                      </span>
                    </div>

                    {order.status === "COMPLETED" && keyValue && (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/10">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                          <code className="text-xs font-mono text-white truncate select-all font-bold">
                            {keyValue}
                          </code>
                        </div>
                        <button
                          onClick={() => handleCopy(keyValue)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={isRedeemCode ? "Copy Redeem Code" : "Copy Key"}
                          aria-label="Copy Code"
                        >
                          {copiedKey === keyValue ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono">
                        Payment: Successful
                      </span>
                      <button
                        onClick={() => openOrderDetails(order)}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
