"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Gift,
  Gamepad2,
  Code2,
  Bot,
  Cloud,
  Wrench,
  Receipt,
  Tag,
  Calendar,
  CreditCard,
  X,
  Layers,
  HelpCircle,
  Video,
  XCircle,
  Package,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import TutorialVideoPlayer from "@/components/TutorialVideoPlayer";

export interface PurchasedProduct {
  orderId: number;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryStatus: string;
  itemId: number;
  productId?: string | number;
  productName: string;
  variantName: string;
  category: string;
  faceValue?: number | null;
  paidPrice: number;
  discountPercent?: number | null;
  deliveredCode?: string;
  howToUse?: string[] | string | null;
  tutorialVideoUrl?: string | null;
  tutorialVideoTitle?: string | null;
  tutorialVideoDesc?: string | null;
  rawOrder: any;
}

export default function MyKeysPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<{ [key: string]: boolean }>({});
  const [selectedProduct, setSelectedProduct] = useState<PurchasedProduct | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch orders and catalog products for the logged-in customer
  const fetchPurchasedProducts = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // 1. Fetch real user orders (isolated by server-side session token)
      const ordersPromise = api.get<any[]>("/v1/orders/");
      // 2. Fetch catalog products to retrieve configured instructions & tutorial videos
      const catalogPromise = api.get<any[]>("/v1/products/").catch(() => []);

      const [orders, catalogList] = await Promise.all([ordersPromise, catalogPromise]);

      const productMap: Record<string, any> = {};
      if (Array.isArray(catalogList)) {
        catalogList.forEach((p: any) => {
          if (p.id) productMap[String(p.id)] = p;
          if (p.title) productMap[p.title.toLowerCase()] = p;
        });
      }
      setCatalogProducts(productMap);

      const extracted: PurchasedProduct[] = [];

      (Array.isArray(orders) ? orders : []).forEach((order) => {
        (order.items || []).forEach((item: any, itemIdx: number) => {
          // Look up corresponding product in catalog if available for instructions & tutorial video
          const matchedProd =
            (item.product_id && productMap[String(item.product_id)]) ||
            (item.product_name_snapshot && productMap[item.product_name_snapshot.toLowerCase()]) ||
            null;

          const pName = item.product_name_snapshot || matchedProd?.title || "Digital Product";
          const vName = item.variant_name_snapshot || "Standard Edition";
          const cat =
            item.category ||
            matchedProd?.category ||
            (pName.toLowerCase().includes("voucher") ||
            pName.toLowerCase().includes("redeem") ||
            pName.toLowerCase().includes("code") ||
            pName.toLowerCase().includes("gift")
              ? "Redeem Codes"
              : pName.toLowerCase().includes("ai") || pName.toLowerCase().includes("gpt")
              ? "AI Tools"
              : pName.toLowerCase().includes("server") || pName.toLowerCase().includes("host")
              ? "Cloud Hosting"
              : pName.toLowerCase().includes("game") || pName.toLowerCase().includes("play")
              ? "Gaming"
              : "Software Licenses");

          const faceVal = item.face_value ?? matchedProd?.face_value ?? matchedProd?.faceValue ?? null;
          const paid = item.price_at_purchase ?? order.total_amount;
          let discPct = item.discount_percent ?? null;
          if (discPct === null && faceVal && faceVal > paid) {
            discPct = Math.round(((faceVal - paid) / faceVal) * 100);
          }

          const delCode = item.product_key?.key_value;
          const delStatus =
            item.delivery_status ||
            (delCode ? "Delivered" : order.status === "COMPLETED" ? "Delivered" : "Pending");

          extracted.push({
            orderId: order.id,
            orderDate: order.created_at,
            orderStatus: order.status || "COMPLETED",
            paymentStatus: order.payment_status || "Successful",
            paymentMethod: order.payment_method || "Wallet Vault",
            deliveryStatus: delStatus,
            itemId: item.id || itemIdx + 1,
            productId: item.product_id || matchedProd?.id,
            productName: pName,
            variantName: vName,
            category: cat,
            faceValue: faceVal,
            paidPrice: paid,
            discountPercent: discPct,
            deliveredCode: delCode,
            howToUse: matchedProd?.how_to_use || matchedProd?.howToUse || null,
            tutorialVideoUrl: matchedProd?.tutorial_video_url || matchedProd?.tutorialVideoUrl || null,
            tutorialVideoTitle: matchedProd?.tutorial_video_title || matchedProd?.tutorialVideoTitle || null,
            tutorialVideoDesc: matchedProd?.tutorial_video_desc || matchedProd?.tutorialVideoDesc || null,
            rawOrder: order,
          });
        });
      });

      setProducts(extracted);
    } catch (err: any) {
      setError(err.message || "Failed to load purchased products.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPurchasedProducts();
  }, []);

  const handleCopyCode = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const toggleRevealCode = (id: string) => {
    setRevealedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openDetailsModal = (product: PurchasedProduct) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  // Category visual badge & icon helper
  const getCategoryDetails = (category: string) => {
    const c = (category || "").toLowerCase();
    if (c.includes("redeem") || c.includes("voucher") || c.includes("gift")) {
      return {
        label: "Redeem Code",
        icon: <Gift className="w-3.5 h-3.5 text-purple-400" />,
        badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        codeLabel: "Redeem Code",
      };
    }
    if (c.includes("ai") || c.includes("gpt") || c.includes("bot")) {
      return {
        label: "AI Tool",
        icon: <Bot className="w-3.5 h-3.5 text-cyan-400" />,
        badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        codeLabel: "Access Token",
      };
    }
    if (c.includes("cloud") || c.includes("host") || c.includes("server")) {
      return {
        label: "Cloud Hosting",
        icon: <Cloud className="w-3.5 h-3.5 text-blue-400" />,
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        codeLabel: "Server Key",
      };
    }
    if (c.includes("game") || c.includes("gaming")) {
      return {
        label: "Gaming Product",
        icon: <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />,
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        codeLabel: "Activation Key",
      };
    }
    if (c.includes("software") || c.includes("license")) {
      return {
        label: "Software License",
        icon: <Code2 className="w-3.5 h-3.5 text-indigo-400" />,
        badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        codeLabel: "License Serial",
      };
    }
    return {
      label: category || "Digital Product",
      icon: <Package className="w-3.5 h-3.5 text-primary" />,
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      codeLabel: "Access Code",
    };
  };

  // Product status badge helper (based on real data only)
  const getStatusBadge = (status: string, hasDeliveredCode: boolean) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED" || s === "DELIVERED" || s === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          <span>{hasDeliveredCode ? "Delivered" : "Active"}</span>
        </span>
      );
    }
    if (s === "PENDING" || s === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
          <Clock className="w-3 h-3 animate-spin" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 shrink-0">
          <Clock className="w-3 h-3" />
          <span>Expired</span>
        </span>
      );
    }
    if (s === "REFUNDED") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
          <RefreshCw className="w-3 h-3" />
          <span>Refunded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 shrink-0">
        <XCircle className="w-3 h-3" />
        <span>{status || "Cancelled"}</span>
      </span>
    );
  };

  // Filter products by search and status
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Status filter
      if (statusFilter === "DELIVERED") {
        if (!item.deliveredCode && item.orderStatus.toUpperCase() !== "COMPLETED") return false;
      } else if (statusFilter === "PENDING") {
        if (item.deliveredCode || item.orderStatus.toUpperCase() === "COMPLETED") return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const cat = item.category.toLowerCase();
        if (categoryFilter === "REDEEM" && !cat.includes("redeem") && !cat.includes("voucher")) return false;
        if (categoryFilter === "AI" && !cat.includes("ai") && !cat.includes("gpt")) return false;
        if (categoryFilter === "HOSTING" && !cat.includes("cloud") && !cat.includes("host")) return false;
        if (categoryFilter === "GAMING" && !cat.includes("game") && !cat.includes("cheat")) return false;
        if (categoryFilter === "SOFTWARE" && !cat.includes("software") && !cat.includes("license")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchVariant = item.variantName.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchCode = (item.deliveredCode || "").toLowerCase().includes(q);
        const matchOrder = `hm-${item.orderId}`.includes(q) || `${item.orderId}`.includes(q);
        return matchName || matchVariant || matchCategory || matchCode || matchOrder;
      }

      return true;
    });
  }, [products, statusFilter, categoryFilter, searchQuery]);

  const deliveredCount = products.filter(
    (p) => !!p.deliveredCode || p.orderStatus.toUpperCase() === "COMPLETED"
  ).length;

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 px-3 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2 min-h-[40px] text-xs font-mono text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/orders"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <Receipt className="w-3.5 h-3.5 text-primary" />
              <span>Order History</span>
            </Link>

            <Link
              href="/#modules-section"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,194,255,0.25)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-purple-400 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>AUTHENTIC DIGITAL PRODUCTS VAULT</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Purchased Products
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                All purchased redeem codes, software licenses, game access, and AI tools for {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPurchasedProducts(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors min-h-[42px] flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
              title="Refresh purchased products"
              aria-label="Refresh purchased products"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/products"
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-primary hover:text-white transition-colors flex items-center gap-1.5 min-h-[42px]"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              <span>Browse Catalog</span>
            </Link>
          </div>
        </div>

        {/* Quick Instructions & Overview Callout */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Your Delivered Codes & Licenses</h3>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Click <span className="text-primary font-mono font-semibold">Copy Code</span> or <span className="text-primary font-mono font-semibold">View Details</span> to access instructions and walkthrough tutorial videos for any of your purchases.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{deliveredCount} Items Ready & Fulfilled</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#0c0e17]/60 backdrop-blur-xl space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product, variant, order, or code..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 font-mono"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto">
              {[
                { id: "ALL", label: `All (${products.length})` },
                { id: "DELIVERED", label: `Delivered (${deliveredCount})` },
                { id: "PENDING", label: `Pending Fulfillment` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap min-h-[36px] ${
                    statusFilter === tab.id
                      ? "bg-purple-600 text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs font-mono">
            <span className="text-gray-500 text-[11px] uppercase tracking-wider mr-1">Types:</span>
            {[
              { id: "ALL", label: "All Products" },
              { id: "REDEEM", label: "Redeem Codes" },
              { id: "GAMING", label: "Gaming" },
              { id: "AI", label: "AI Tools" },
              { id: "HOSTING", label: "Cloud Hosting" },
              { id: "SOFTWARE", label: "Software" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap transition-colors min-h-[30px] ${
                  categoryFilter === cat.id
                    ? "bg-white/15 border-white/30 text-white font-bold"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* EMPTY STATE (Strict Requirement 10) */
          <div className="rounded-3xl border border-dashed border-white/15 bg-[#0c0e17]/60 p-10 sm:p-14 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">No purchased products yet.</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
              {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
                ? "No purchases match your applied search query or category filters."
                : "Explore our verified marketplace to acquire instant redeem codes, cloud hosting, AI subscriptions, and software access."}
            </p>
            <Link
              href="/#modules-section"
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] min-h-[44px] inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredProducts.map((item, index) => {
              const uniqueKeyId = `${item.orderId}-${item.itemId}-${index}`;
              const isRevealed = revealedCodes[uniqueKeyId];
              const catDetails = getCategoryDetails(item.category);
              const isDelivered = !!item.deliveredCode;

              // Format date
              const purchaseDateFormatted = item.orderDate
                ? new Date(item.orderDate).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Recently";

              return (
                <div
                  key={uniqueKeyId}
                  className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all shadow-lg relative group"
                >
                  {/* Top Bar: Category Type Badge & Status Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${catDetails.badgeClass}`}
                      >
                        {catDetails.icon}
                        <span>{catDetails.label}</span>
                      </div>

                      {getStatusBadge(item.orderStatus, isDelivered)}
                    </div>

                    {/* Product Name & Variant */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-base leading-snug">
                        {item.productName}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                        <span className="text-primary font-semibold">
                          {item.variantName}
                        </span>
                      </div>
                    </div>

                    {/* Historical Pricing Information (Requirement 2 & 8) */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      {item.faceValue && item.faceValue > item.paidPrice ? (
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">Face Value</span>
                          <span className="text-gray-400 line-through font-semibold">
                            ₹{Number(item.faceValue).toFixed(2)}
                          </span>
                        </div>
                      ) : null}

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Paid</span>
                        <span className="text-white font-extrabold text-sm">
                          ₹{Number(item.paidPrice).toFixed(2)}
                        </span>
                      </div>

                      {item.discountPercent && item.discountPercent > 0 ? (
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">Discount</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[11px] inline-block">
                            {item.discountPercent}% OFF
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Purchase Meta: Date & Order ID */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-3 pt-2 border-t border-white/[0.06]">
                      <span className="text-gray-400">
                        Purchased: <strong className="text-gray-200">{purchaseDateFormatted}</strong>
                      </span>
                      <span>
                        Order: <strong className="text-white">#HM-{item.orderId}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Code Delivery Box (Requirement 3) */}
                  {isDelivered ? (
                    <div className="p-3.5 rounded-xl bg-black/50 border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase font-semibold">
                        <span className="flex items-center gap-1.5 text-purple-300">
                          <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                          <span>{catDetails.codeLabel}</span>
                        </span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/80 border border-white/10 px-3 py-2.5 rounded-xl font-mono text-xs sm:text-sm text-primary overflow-x-auto select-all break-all tracking-wider font-bold">
                          {isRevealed ? item.deliveredCode : "••••••••-••••-••••"}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleRevealCode(uniqueKeyId)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={isRevealed ? "Hide Code" : "Reveal Code"}
                          aria-label={isRevealed ? "Hide Code" : "Reveal Code"}
                        >
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyCode(item.deliveredCode!)}
                          className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold transition-colors shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] shadow-[0_0_12px_rgba(0,194,255,0.3)]"
                          title="Copy Code"
                          aria-label="Copy Code"
                        >
                          {copiedCode === item.deliveredCode ? (
                            <Check className="w-4 h-4 text-emerald-950 font-black" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {copiedCode === item.deliveredCode && (
                        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Code copied to clipboard!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PENDING FULFILLMENT BOX (Requirement 3) */
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 flex items-center gap-2.5 font-mono">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Code pending fulfillment. Delivery will reflect once validated.</span>
                    </div>
                  )}

                  {/* Bottom Actions: View Details Modal Button */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] font-mono text-gray-400">
                      Status: <span className="text-white font-semibold">{item.deliveryStatus}</span>
                    </span>

                    <button
                      onClick={() => openDetailsModal(item)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-mono font-bold transition-all inline-flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW DETAILS MODAL (Requirements 5, 6, 7) */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isDetailsOpen && selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDetailsOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-2xl bg-[#0c0e17] border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden z-10 my-6 max-h-[92vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-extrabold text-white">
                          Purchased Product Details
                        </h3>
                        {getStatusBadge(selectedProduct.orderStatus, !!selectedProduct.deliveredCode)}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        Order #HM-{selectedProduct.orderId} • {selectedProduct.productName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-6 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                  {/* Detailed Specs Grid (Requirement 5) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 font-mono text-xs">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold border-b border-white/10 pb-2">
                      Transaction & Product Metadata
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Product Name:</span>
                          <span className="text-white font-bold font-sans text-right max-w-[180px]">
                            {selectedProduct.productName}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Category / Type:</span>
                          <span className="text-purple-400 font-semibold">
                            {selectedProduct.category}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Denomination:</span>
                          <span className="text-primary font-bold">
                            {selectedProduct.variantName}
                          </span>
                        </div>

                        {selectedProduct.faceValue && selectedProduct.faceValue > selectedProduct.paidPrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Face Value:</span>
                            <span className="text-gray-400 line-through">
                              ₹{Number(selectedProduct.faceValue).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center font-bold">
                          <span className="text-gray-300">Selling Price Paid:</span>
                          <span className="text-white text-sm font-extrabold text-primary">
                            ₹{Number(selectedProduct.paidPrice).toFixed(2)}
                          </span>
                        </div>

                        {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-400">Applied Discount:</span>
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {selectedProduct.discountPercent}% OFF
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Order ID:</span>
                          <span className="text-white font-bold">
                            #HM-{selectedProduct.orderId}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Purchase Date:</span>
                          <span className="text-gray-300 text-right">
                            {selectedProduct.orderDate
                              ? new Date(selectedProduct.orderDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recently"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment Status:</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{selectedProduct.paymentStatus}</span>
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment Method:</span>
                          <span className="text-gray-200">
                            {selectedProduct.paymentMethod}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Order Status:</span>
                          <span className="text-white font-bold">
                            {selectedProduct.orderStatus}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Delivery Status:</span>
                          <span className="text-primary font-bold">
                            {selectedProduct.deliveryStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivered Code / Key Section (Requirement 3 & 5) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/5 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
                        <KeyRound className="w-4 h-4 text-purple-400" />
                        <span>
                          {getCategoryDetails(selectedProduct.category).codeLabel} Delivery
                        </span>
                      </div>
                      {selectedProduct.deliveredCode ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Code Pending Fulfillment</span>
                        </span>
                      )}
                    </div>

                    {selectedProduct.deliveredCode ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-black/80 border border-purple-500/30 px-3.5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold text-primary select-all overflow-x-auto tracking-wider break-all shadow-inner">
                            {selectedProduct.deliveredCode}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyCode(selectedProduct.deliveredCode!)}
                            className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold transition-colors shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                            title="Copy Code"
                            aria-label="Copy Code"
                          >
                            {copiedCode === selectedProduct.deliveredCode ? (
                              <Check className="w-4 h-4 text-emerald-950 font-black" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {copiedCode === selectedProduct.deliveredCode && (
                          <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Code copied to clipboard!</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Code pending fulfillment. Serial key will be displayed here once verified.</span>
                      </div>
                    )}
                  </div>

                  {/* HOW TO USE SECTION (Requirement 6) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <span>How to Use</span>
                    </div>

                    {selectedProduct.howToUse ? (
                      <div className="space-y-2 text-xs text-gray-300 font-sans leading-relaxed">
                        {Array.isArray(selectedProduct.howToUse) ? (
                          <ol className="list-decimal list-inside space-y-1.5 pl-1">
                            {selectedProduct.howToUse.map((step, sIdx) => (
                              <li key={sIdx} className="text-gray-300">
                                {step}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="whitespace-pre-line text-gray-300">
                            {selectedProduct.howToUse}
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Fallback when instructions unavailable (Strict Requirement 6) */
                      <p className="text-xs text-gray-400 font-mono italic">
                        Usage instructions will be available soon.
                      </p>
                    )}
                  </div>

                  {/* TUTORIAL VIDEO SECTION (Requirement 7) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
                      <Video className="w-4 h-4 text-purple-400" />
                      <span>Tutorial Video</span>
                    </div>

                    {selectedProduct.tutorialVideoUrl ? (
                      <TutorialVideoPlayer
                        videoUrl={selectedProduct.tutorialVideoUrl}
                        title={
                          selectedProduct.tutorialVideoTitle ||
                          (selectedProduct.category.toLowerCase().includes("redeem")
                            ? "Tutorial — How to Use This Code"
                            : "Tutorial — How to Use This Product")
                        }
                        description={selectedProduct.tutorialVideoDesc}
                        productTitle={selectedProduct.productName}
                      />
                    ) : (
                      /* Fallback when tutorial video unavailable (Strict Requirement 7) */
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs font-mono text-gray-400 flex flex-col items-center justify-center space-y-1.5 py-8">
                        <Video className="w-6 h-6 text-gray-600 mb-1" />
                        <span className="text-gray-300 font-medium">Tutorial video coming soon.</span>
                        <span className="text-[11px] text-gray-500">
                          Walkthrough guides are currently in preparation by the vendor team.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.01] flex items-center justify-between gap-3 shrink-0">
                  {selectedProduct.productId ? (
                    <Link
                      href={`/products/${selectedProduct.productId}`}
                      className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>Store Product Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-mono">
                      Host Market Place Verified Fulfillment
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors min-h-[42px]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
