"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Package,
  ImageIcon,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  Info,
  Check,
  ChevronRight,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Zap,
  Copy,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  ExternalLink,
  FileText,
} from "lucide-react";
import TutorialVideoPlayer from "@/components/TutorialVideoPlayer";
import { calculateDiscount } from "@/lib/pricing";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

// --- Database-Driven Interfaces ---
export interface ProductVariant {
  id: string;
  productId?: string;
  product_id?: string;
  name: string;
  config_name?: string | null;
  duration?: string | null;
  originalPrice?: number | null;
  sellingPrice: number | string;
  price?: number | string;
  face_value?: number | null;
  faceValue?: number | null;
  availableStock?: number;
  available_stock?: number;
  isActive?: boolean;
  is_active?: boolean;
  status?: string;
  specs?: any;
}

export interface ProductResource {
  id: string;
  productId: string;
  name: string;
  type: string;
  purpose?: string | null;
  url: string;
  status?: string;
}

export interface Product {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  category?: string | { id?: string; name: string; slug: string } | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  originalPrice?: number | null;
  face_value?: number | null;
  faceValue?: number | null;
  sellingPrice?: number | string;
  basePrice?: number | string;
  price?: number | string;
  currency?: string;
  status?: string;
  availability?: string;
  is_active?: boolean;
  features?: string[];
  specs?: any;
  variants: ProductVariant[];
  resources?: ProductResource[];
  created_at?: string;
  createdAt?: string;
}

export default function ProductDetailClient({ initialProduct }: { initialProduct: Product | null }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Purchase modal state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<any | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCodeRevealed, setIsCodeRevealed] = useState<boolean>(true);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  useEffect(() => {
    if (initialProduct?.variants) {
      const activeVars =
        initialProduct.variants.filter(
          (v) => v.isActive !== false && v.is_active !== false && v.status !== "DISABLED"
        ) || [];
      if (activeVars.length > 0) {
        setSelectedVariantId(activeVars[0].id);
      }
    }
  }, [initialProduct]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-gray-400 text-sm font-sans">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center backdrop-blur-xl">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-red-400 text-xs mb-6 leading-relaxed">
          {error || "The requested product is not currently available in the catalog."}
        </p>
        <button
          onClick={() => router.push("/products")}
          className="px-5 py-2.5 bg-primary text-black font-semibold rounded-xl text-xs hover:bg-primary-hover transition-colors"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  // Active variants from backend
  const activeVariants =
    product.variants?.filter(
      (v) => v.isActive !== false && v.is_active !== false && v.status !== "DISABLED"
    ) || [];
  const hasVariants = activeVariants.length > 0;

  const selectedVariant = hasVariants
    ? activeVariants.find((v) => v.id === selectedVariantId) || activeVariants[0]
    : null;

  // Title, Category, and Description
  const displayTitle = product.name || product.title || "Product";
  const displayCategory =
    typeof product.category === "object" && product.category !== null
      ? (product.category as any).name
      : product.category || "Digital Product";
  const displayDescription = product.description || product.shortDescription || "";

  // Authoritative Pricing & Discount
  // If variant selected: use variant pricing. If zero-variant: use product-level pricing.
  const rawSellingPrice = selectedVariant
    ? selectedVariant.sellingPrice ?? selectedVariant.price ?? 0
    : product.sellingPrice ?? product.price ?? product.basePrice ?? 0;
  const currentSellingPrice = Number(rawSellingPrice);

  const rawOriginalPrice = selectedVariant
    ? selectedVariant.originalPrice ?? selectedVariant.face_value ?? (selectedVariant as any).faceValue ?? null
    : product.originalPrice ?? product.face_value ?? (product as any).faceValue ?? null;
  const currentOriginalPrice =
    rawOriginalPrice !== null && rawOriginalPrice !== undefined && !isNaN(Number(rawOriginalPrice))
      ? Number(rawOriginalPrice)
      : null;

  const currentDiscount = calculateDiscount(currentOriginalPrice, currentSellingPrice);

  // Authoritative Wallet Balance Gate
  const currentWalletBalance = Number(user?.wallet?.balance ?? 0);
  const isInsufficientBalance = Boolean(user && currentWalletBalance < currentSellingPrice);
  const balanceShortfall = Math.max(0, currentSellingPrice - currentWalletBalance);

  // Availability / Stock calculation
  const isOutOfStock = hasVariants
    ? selectedVariant
      ? (selectedVariant.availableStock !== undefined && selectedVariant.availableStock <= 0) ||
        (selectedVariant.available_stock !== undefined && selectedVariant.available_stock <= 0)
      : true
    : product.availability === "OUT_OF_STOCK" || product.status === "DISABLED";

  const isPurchasable = !isOutOfStock && product.status === "ACTIVE";

  // Parse How to Use steps from specs or direct field
  let howToUseSteps: string[] = [];
  const rawHowToUse =
    (typeof product.specs === "object" && product.specs !== null ? product.specs.howToUse : null) ||
    (typeof product.specs === "string" ? (() => {
      try { return JSON.parse(product.specs).howToUse; } catch { return null; }
    })() : null);

  if (Array.isArray(rawHowToUse)) {
    howToUseSteps = rawHowToUse.filter((s) => typeof s === "string" && s.trim().length > 0);
  } else if (typeof rawHowToUse === "string" && rawHowToUse.trim()) {
    howToUseSteps = rawHowToUse.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  // Real resources from catalog API
  const videoResource = product.resources?.find(
    (r) =>
      r.type === "VIDEO" ||
      (r.url && (r.url.includes("youtube.com") || r.url.includes("youtu.be")))
  );
  const tutorialVideoUrl = videoResource?.url || null;
  const tutorialVideoTitle = videoResource?.name || `${displayTitle} Tutorial`;

  const docResources =
    product.resources?.filter(
      (r) => r.type === "DOCS" || r.type === "TUTORIAL" || r.type === "DOWNLOAD" || r.type === "OTHER"
    ) || [];

  // Handle Buy Now Click
  const handleBuyNowClick = () => {
    if (!isPurchasable) return;

    if (!user) {
      router.push(`/login?redirect=/products/${product.slug || product.id}`);
      return;
    }

    setPurchaseError(null);
    setPurchaseSuccess(null);
    setIdempotencyKey(`ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    setIsPurchaseModalOpen(true);
  };

  // Confirm Purchase: Send productId + variantId (if variants exist). Backend calculates price authoritatively.
  const handleConfirmPurchase = async () => {
    if (!user) return;
    if (hasVariants && !selectedVariant) return;

    setIsProcessingPurchase(true);
    setPurchaseError(null);

    try {
      const payload: {
        productId: string;
        variantId?: string;
        idempotencyKey: string;
      } = {
        productId: product.id,
        idempotencyKey,
      };

      if (hasVariants && selectedVariant) {
        payload.variantId = selectedVariant.id;
      }

      const orderData = await api.post("/orders", payload);

      setPurchaseSuccess(orderData);
      if (refreshUser) {
        refreshUser().catch(() => {});
      }
    } catch (err: any) {
      setPurchaseError(err.message || "Purchase could not be completed.");
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Image source
  const imageSrc = product.imageUrl || product.image_url;

  // Order Details Extract for Result Modal
  const resultOrder = purchaseSuccess;
  const resultFirstItem = resultOrder?.items?.[0];
  const resultDeliveredCode = resultFirstItem?.product_key?.key_value;
  const resultProductTitle = resultFirstItem?.productNameSnapshot || resultFirstItem?.product_name_snapshot || displayTitle;
  const resultVariantTitle =
    resultFirstItem?.variantNameSnapshot ||
    resultFirstItem?.variant_name_snapshot ||
    selectedVariant?.name ||
    selectedVariant?.duration;
  const resultPaidAmount =
    resultFirstItem?.priceAtPurchase ??
    resultFirstItem?.price_at_purchase ??
    resultOrder?.totalAmount ??
    resultOrder?.total_amount ??
    currentSellingPrice;
  const resultOrderId = resultOrder?.id ? `#HM-${resultOrder.id.slice(0, 8)}` : "#HM-ORDER";
  const resultPurchaseDate = resultOrder?.createdAt ? new Date(resultOrder.createdAt) : new Date();

  return (
    <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-8 max-w-5xl pb-32">
      {/* Back to Marketplace Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/products"
          className="inline-flex items-center text-xs font-mono text-gray-400 hover:text-white transition-colors gap-2 min-h-[44px] px-1"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to Marketplace</span>
        </Link>
        <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest hidden sm:inline">
          {displayCategory}
        </span>
      </div>

      {/* Main Product Showcase Card */}
      <div className="w-full bg-[#0b0d17]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-8 relative">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10">
          {/* Left Column: Visual Showcase & Descriptions (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between bg-black/20">
            <div>
              {/* Product Image / Visual Showcase */}
              <div className="relative w-full h-60 sm:h-72 bg-black/40 rounded-2xl flex items-center justify-center overflow-hidden mb-5 border border-white/10 shadow-inner group">
                {imageSrc && !imageError ? (
                  <Image
                    src={imageSrc}
                    alt={displayTitle}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                    <ImageIcon className="w-14 h-14 mb-2 opacity-40 text-gray-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                      {displayCategory}
                    </span>
                  </div>
                )}

                {product.status !== "ACTIVE" && (
                  <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1 rounded-lg">
                    Unavailable
                  </div>
                )}
              </div>

              {/* Category Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold">
                  {displayCategory}
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  {product.currency || "INR"}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                {displayTitle}
              </h1>

              {/* Short Description */}
              {product.shortDescription && (
                <p className="text-xs sm:text-sm text-gray-300 font-medium mb-3 leading-relaxed">
                  {product.shortDescription}
                </p>
              )}

              {/* Full Description */}
              {displayDescription && (
                <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {displayDescription}
                </div>
              )}

              {/* Features (real only) */}
              {product.features && product.features.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
                    Product Features
                  </span>
                  <div className="space-y-1.5">
                    {product.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Authenticity Guarantee */}
            <div className="pt-6 border-t border-white/10 mt-6 flex items-center gap-2 text-xs font-mono text-gray-400">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Digital product fulfillment</span>
            </div>
          </div>

          {/* Right Column: Pricing & Variant Selector & Buy Action (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-black/40">
            <div className="space-y-6">
              {/* Pricing Highlight Card */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>{currentDiscount.hasDiscount ? "Special Price" : "Price"}</span>
                  </span>

                  {currentDiscount.hasDiscount && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      {currentDiscount.discountPercent}% OFF
                    </span>
                  )}
                </div>

                {/* Strikethrough Original Price */}
                {currentDiscount.hasDiscount && currentOriginalPrice ? (
                  <div className="flex items-center gap-2 mb-1.5 text-xs sm:text-sm font-mono text-gray-400 flex-wrap">
                    <span className="text-gray-400">List Price:</span>
                    <span className="line-through text-gray-500">
                      ₹{currentOriginalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      (Save ₹{currentDiscount.savings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                ) : currentOriginalPrice ? (
                  <div className="flex items-center gap-2 mb-1.5 text-xs sm:text-sm font-mono text-gray-400 flex-wrap">
                    <span className="text-gray-400">Original Price:</span>
                    <span className="text-gray-300">
                      ₹{currentOriginalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : null}

                {/* Current Selling Price */}
                <div className="flex items-baseline gap-1.5 my-2">
                  <span className="text-xl font-normal text-primary">₹</span>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    {currentSellingPrice.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-mono text-gray-400 ml-1">
                    {product.currency || "INR"}
                  </span>
                </div>

                {/* Availability Tag */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="font-mono text-gray-400">Status:</span>
                  {!isOutOfStock ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono font-semibold">
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Out of stock
                    </span>
                  )}
                </div>
              </div>

              {/* Real Variants / Plans Selector (Only shown if real variants exist) */}
              {hasVariants && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2.5">
                    Select Plan / Variant
                  </h3>
                  <div className="space-y-2.5">
                    {activeVariants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const vPrice = Number(variant.sellingPrice ?? variant.price ?? 0);
                      const vOrig =
                        variant.originalPrice ?? variant.face_value ?? (variant as any).faceValue ?? null;
                      const vDiscount = calculateDiscount(vOrig, vPrice);
                      const vOutOfStock =
                        (variant.availableStock !== undefined && variant.availableStock <= 0) ||
                        (variant.available_stock !== undefined && variant.available_stock <= 0);

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between outline-none ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,194,255,0.15)] text-white"
                              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-gray-300"
                          } ${vOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex-1 pr-3">
                            <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                              <span>{variant.name}</span>
                              {variant.duration && (
                                <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-300 rounded-md font-mono border border-white/10">
                                  {variant.duration}
                                </span>
                              )}
                              {vDiscount.hasDiscount && (
                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-md font-mono font-bold">
                                  {vDiscount.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 font-mono flex items-center gap-2 flex-wrap">
                              {vDiscount.hasDiscount && vOrig && (
                                <span className="line-through text-gray-500">
                                  ₹{Number(vOrig).toFixed(2)}
                                </span>
                              )}
                              <span className="text-white font-semibold">₹{vPrice.toFixed(2)}</span>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-primary" : "border-white/20"
                            }`}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BUY NOW Button */}
              <div className="pt-2">
                <button
                  id="product-buy-now-btn"
                  onClick={handleBuyNowClick}
                  disabled={!isPurchasable}
                  className={`w-full py-4 min-h-[50px] rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center transition-all outline-none ${
                    !isPurchasable
                      ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      : "bg-primary text-black hover:bg-primary-hover shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] cursor-pointer"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {!isPurchasable ? "Out of Stock" : "BUY NOW"}
                </button>

                <p className="text-[11px] text-gray-500 text-center font-mono mt-3 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                  <span>Instant automatic fulfillment to your Order History upon purchase</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to Use & Tutorial Video Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
        {/* HOW TO USE */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">How to Use</h3>
                <span className="text-[11px] font-mono text-gray-400">
                  Step-by-Step Instructions
                </span>
              </div>
            </div>

            {howToUseSteps.length > 0 ? (
              <div className="space-y-3 mt-4">
                {howToUseSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/30 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 px-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center my-4">
                <Info className="w-8 h-8 text-gray-500 mb-2 opacity-60" />
                <h4 className="text-xs font-semibold text-gray-300 mb-1">
                  Usage instructions will be available soon.
                </h4>
                <p className="text-[11px] text-gray-500 max-w-sm">
                  Official configuration steps will be populated shortly. You can also refer to the product documentation or contact support.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 mt-6 flex items-center justify-between text-[11px] font-mono text-gray-400 flex-wrap gap-2">
            <span>Delivered via: User Dashboard</span>
            <Link
              href="/dashboard/orders"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <span>Order History</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* TUTORIAL VIDEO */}
        <TutorialVideoPlayer
          videoUrl={tutorialVideoUrl}
          title={tutorialVideoTitle}
          productTitle={displayTitle}
        />
      </div>

      {/* Real Documentation & Resources Section (if available) */}
      {docResources.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-xl mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Documentation & Resources
              </h3>
              <span className="text-[11px] font-mono text-gray-400">Links & Guides</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {docResources.map((res) => (
              <a
                key={res.id}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-white/[0.04] transition-all flex items-center justify-between group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                    {res.name}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    {res.type} {res.purpose ? `• ${res.purpose}` : ""}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Fulfillment Policy */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-xl mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Important Information</h3>
            <span className="text-[11px] font-mono text-gray-400">Fulfillment & Terms</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-gray-300 leading-relaxed">
              Digital product delivered upon order completion.
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-xs text-gray-300 leading-relaxed">
              Orders and license details can be reviewed anytime from your User Dashboard.
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-gray-300 leading-relaxed">
              Digital purchases are processed via your wallet balance with authoritative rate verification.
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {isPurchasable && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e17]/95 backdrop-blur-xl border-t border-white/10 p-3 sm:hidden shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-gray-400 truncate">{displayTitle}</div>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-base font-bold text-white">
                  ₹{currentSellingPrice.toFixed(2)}
                </span>
                {currentDiscount.hasDiscount && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {currentDiscount.discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleBuyNowClick}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 bg-primary text-black shadow-[0_0_15px_rgba(0,194,255,0.3)]"
            >
              BUY NOW
            </button>
          </div>
        </div>
      )}

      {/* Purchase Confirmation & Result Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#0c0e17] border border-white/10 p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            {!purchaseSuccess ? (
              <>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <span>Confirm Purchase</span>
                  </h3>
                  <button
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="text-gray-400 hover:text-white text-xs font-mono p-1"
                  >
                    Cancel
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 mb-4 text-xs font-mono">
                  <div className="flex justify-between items-start text-gray-300">
                    <span className="text-gray-400">Product:</span>
                    <span className="text-white font-bold text-right font-sans max-w-[240px]">
                      {displayTitle}
                    </span>
                  </div>
                  {selectedVariant && (
                    <div className="flex justify-between text-gray-300">
                      <span className="text-gray-400">Plan:</span>
                      <span className="text-white font-bold">{selectedVariant.name}</span>
                    </div>
                  )}
                  {currentDiscount.hasDiscount && currentOriginalPrice && (
                    <div className="flex justify-between text-gray-400">
                      <span>List Price:</span>
                      <span className="line-through">₹{currentOriginalPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {currentDiscount.hasDiscount && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Discount:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {currentDiscount.discountPercent}% OFF
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2.5 flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Amount Due:</span>
                    <span className="text-primary font-black text-base">
                      ₹{currentSellingPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Insufficient Wallet Balance Warning */}
                {isInsufficientBalance && (
                  <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Insufficient Wallet Balance</span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Balance:</span>
                        <span className="text-white font-semibold">₹{currentWalletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Required Amount:</span>
                        <span className="text-white font-semibold">₹{currentSellingPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold border-t border-amber-500/20 pt-1">
                        <span>Shortfall:</span>
                        <span>₹{balanceShortfall.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Link
                        href="/dashboard/deposit"
                        className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs font-mono transition-colors shadow-md min-h-[38px]"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Add Funds to Wallet</span>
                      </Link>
                    </div>
                  </div>
                )}

                {purchaseError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {!isInsufficientBalance && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 mb-6 flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <span>Current Wallet Balance:</span>
                    </div>
                    <span className="text-emerald-400 font-bold">
                      ₹{currentWalletBalance.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl text-xs font-mono transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                  {isInsufficientBalance ? (
                    <Link
                      href="/dashboard/deposit"
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs font-mono transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] min-h-[44px]"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Add Funds</span>
                    </Link>
                  ) : (
                    <button
                      onClick={handleConfirmPurchase}
                      disabled={isProcessingPurchase}
                      className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-bold rounded-xl text-xs font-mono transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,194,255,0.25)] min-h-[44px]"
                    >
                      {isProcessingPurchase ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm & Pay</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* Result Header */}
                {resultOrder?.status === "REFUNDED" ? (
                  <div className="text-center pb-4 border-b border-white/10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono font-bold mb-1">
                      <span>Order Refunded</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">Provider Unavailable</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
                      The provider could not fulfill this item. Your wallet was automatically refunded ₹{Number(resultPaidAmount).toFixed(2)} in full.
                    </p>
                  </div>
                ) : resultOrder?.status === "PROCESSING" ? (
                  <div className="text-center pb-4 border-b border-white/10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono font-bold mb-1">
                      <span>Fulfillment in Progress</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">Order Processing</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
                      Your order has been submitted and is awaiting confirmation from the provider. You can track status in your order history.
                    </p>
                  </div>
                ) : (
                  <div className="text-center pb-4 border-b border-white/10">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Purchase Successful</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">Order Completed</h3>
                  </div>
                )}

                {/* Real Order Details */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 text-[11px]">Product:</span>
                    <span className="text-white font-bold text-right font-sans text-xs sm:text-sm">
                      {resultProductTitle}
                    </span>
                  </div>

                  {resultVariantTitle && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Plan:</span>
                      <span className="text-primary font-bold">{resultVariantTitle}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-300">Amount Paid:</span>
                    <span className="text-primary font-extrabold text-sm">
                      ₹{Number(resultPaidAmount).toFixed(2)}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-2 space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Order ID:</span>
                      <span className="text-white font-bold">{resultOrderId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-gray-300">
                        {resultPurchaseDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        resultOrder?.status === "REFUNDED"
                          ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                          : resultOrder?.status === "PROCESSING"
                          ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                          : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      }`}>
                        {resultOrder?.status || "COMPLETED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key/Code delivery if available */}
                {resultDeliveredCode && (resultOrder?.status === "COMPLETED" || !resultOrder?.status) && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase tracking-wider">
                        <KeyRound className="w-3.5 h-3.5 text-primary" />
                        <span>Product License / Key</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Delivered</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/80 border border-primary/30 px-3.5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black text-primary select-all overflow-x-auto tracking-wider break-all shadow-inner">
                        {isCodeRevealed ? resultDeliveredCode : "••••••••-••••-••••"}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCodeRevealed(!isCodeRevealed)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
                        title={isCodeRevealed ? "Hide Code" : "Reveal Code"}
                      >
                        {isCodeRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(resultDeliveredCode)}
                        className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold transition-colors shrink-0 flex items-center justify-center min-h-[42px] min-w-[42px] shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                        title="Copy Code"
                      >
                        {copiedCode === resultDeliveredCode ? (
                          <Check className="w-4 h-4 text-emerald-950 font-black" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setIsPurchaseModalOpen(false);
                      setPurchaseSuccess(null);
                    }}
                    className="w-full sm:flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl text-xs font-mono transition-colors min-h-[44px]"
                  >
                    Close
                  </button>
                  <Link
                    href="/dashboard/orders"
                    className="w-full sm:flex-1 py-3 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl text-xs font-mono transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,194,255,0.25)] min-h-[44px]"
                  >
                    <span>View Order History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
