"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  X,
  ImageIcon,
  Upload,
  Layers,
  Sliders,
  DollarSign,
  Info,
  ExternalLink,
  Save,
  Check,
  Tag,
  Server,
  FileText,
} from "lucide-react";

interface VariantItem {
  id: string;
  productId: string;
  name: string;
  duration: string;
  originalPrice: string | null;
  sellingPrice: string;
  costPrice: string | null;
  specs: any;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ResourceItem {
  id: string;
  productId: string | null;
  name: string;
  type: string;
  purpose: string | null;
  url: string;
  status: string;
  sortOrder: number;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  isActive?: boolean;
}

interface ProviderOption {
  id: string;
  name: string;
  code: string;
}

type TabType = "basic" | "media" | "details" | "variants" | "pricing" | "resources";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Authoritative DB state
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  // Tab 1: Basic Info Form State
  const [basicName, setBasicName] = useState("");
  const [basicSlug, setBasicSlug] = useState("");
  const [basicCategoryId, setBasicCategoryId] = useState("");
  const [basicProviderId, setBasicProviderId] = useState("");
  const [basicProviderProductId, setBasicProviderProductId] = useState("");
  const [basicProductType, setBasicProductType] = useState("Hosting");
  const [basicShortDescription, setBasicShortDescription] = useState("");
  const [basicDescription, setBasicDescription] = useState("");
  const [basicStatus, setBasicStatus] = useState("ACTIVE");
  const [basicSortOrder, setBasicSortOrder] = useState(10);

  // Tab 2: Media Form State
  const [mediaImageUrl, setMediaImageUrl] = useState("");
  const [localFilePreview, setLocalFilePreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaSuccess, setMediaSuccess] = useState<string | null>(null);

  // Tab 3: Details & Specs State
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [specsList, setSpecsList] = useState<Array<{ key: string; value: string }>>([]);
  const [howToUse, setHowToUse] = useState("");

  // Tab 4: Variants State & Modals
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantItem | null>(null);
  const [variantFormData, setVariantFormData] = useState({
    name: "",
    duration: "1 Month",
    originalPrice: "",
    sellingPrice: "",
    costPrice: "",
    stock: 100,
    isActive: true,
    sortOrder: 10,
  });

  // Tab 5: Pricing State
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceSelling, setPriceSelling] = useState("");
  const [priceCost, setPriceCost] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("INR");

  // Tab 6: Resources State & Modal
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceFormData, setResourceFormData] = useState({
    name: "",
    type: "DOCS",
    url: "",
    purpose: "Setup documentation",
  });

  // Fetch full product details from Admin API
  const fetchProductData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    try {
      const [prodRes, catsRes, provsRes] = await Promise.all([
        adminApi.getProduct(productId),
        adminApi.getCategories(),
        adminApi.getProviders(),
      ]);

      if (catsRes && catsRes.categories) {
        setCategories(catsRes.categories);
      }

      if (provsRes && provsRes.providers) {
        setProviders(provsRes.providers);
      }

      if (prodRes && prodRes.product) {
        const p = prodRes.product;
        setProduct(p);

        // Populate Basic
        setBasicName(p.name || "");
        setBasicSlug(p.slug || "");
        setBasicCategoryId(p.categoryId || "");
        setBasicProviderId(p.providerId || "");
        setBasicProviderProductId(p.providerProductId || "");
        setBasicShortDescription(p.shortDescription || "");
        setBasicDescription(p.description || "");
        setBasicStatus(p.status || "ACTIVE");
        setBasicSortOrder(p.sortOrder ?? 10);

        // Populate Media
        setMediaImageUrl(p.imageUrl || "");
        setLocalFilePreview(null);
        setSelectedFileName(null);

        // Populate Details from specs JSON
        const sp = p.specs || {};
        setBasicProductType(sp.productType || "Hosting");
        setFeatures(Array.isArray(sp.features) ? sp.features : []);
        setHowToUse(sp.howToUse || "");

        const extractedSpecs: Array<{ key: string; value: string }> = [];
        for (const [k, v] of Object.entries(sp)) {
          if (k !== "features" && k !== "howToUse" && k !== "productType" && typeof v === "string") {
            extractedSpecs.push({ key: k, value: v });
          }
        }
        setSpecsList(extractedSpecs);

        // Populate Variants (Real DB variants only, no fake Standard/Lifetime)
        setVariants(Array.isArray(p.variants) ? p.variants : []);

        // Populate Pricing
        setPriceSelling(p.sellingPrice || "");
        setPriceOriginal(p.originalPrice || "");
        setPriceCost(p.costPrice || "");
        setPriceCurrency(p.currency || "INR");

        // Populate Resources
        setResources(Array.isArray(p.resources) ? p.resources : []);
      }

      if (catsRes?.categories) setCategories(catsRes.categories);
      if (provsRes?.providers) setProviders(provsRes.providers);
    } catch (err: any) {
      console.error("Failed to load product detail:", err);
      setError(err?.message || "Failed to load product from backend.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  // Discount calculation helper
  const calculateDiscount = (origStr: string, sellStr: string) => {
    const orig = parseFloat(origStr);
    const sell = parseFloat(sellStr);
    if (!orig || !sell || orig <= 0 || sell <= 0 || sell >= orig) return null;
    return (((orig - sell) / orig) * 100).toFixed(2);
  };

  // Quick Status Toggle in Header
  const handleQuickStatusChange = async (newStatus: string) => {
    try {
      await adminApi.updateProductStatus(productId, newStatus);
      setBasicStatus(newStatus);
      if (product) setProduct({ ...product, status: newStatus });
      setActionSuccess(`Status updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update status.");
    }
  };

  // Save Tab 1: Basic Info
  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection("basic");
    setError(null);
    try {
      const sp = product?.specs || {};
      const updatedSpecs = { ...sp, productType: basicProductType };

      await adminApi.updateProduct(productId, {
        name: basicName.trim(),
        slug: basicSlug.trim(),
        categoryId: basicCategoryId,
        providerId: basicProviderId || null,
        providerProductId: basicProviderProductId.trim() || null,
        shortDescription: basicShortDescription.trim() || null,
        description: basicDescription.trim(),
        status: basicStatus,
        sortOrder: Number(basicSortOrder),
        specs: updatedSpecs,
      });

      setActionSuccess("Basic information saved successfully.");
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save basic info.");
    } finally {
      setSavingSection(null);
    }
  };

  // Save Tab 2: Media Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMediaError("File size exceeds 5 MB limit. Please select a smaller file.");
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setMediaError(null);
      setMediaSuccess(null);
      if (localFilePreview) URL.revokeObjectURL(localFilePreview);
      const preview = URL.createObjectURL(file);
      setLocalFilePreview(preview);
    }
  };

  // Upload and persist immediately to Product (Task 12: Image Replacement)
  const handleUploadAndSave = async () => {
    if (!selectedFile) return;
    setUploadingMedia(true);
    setMediaError(null);
    setMediaSuccess(null);
    const oldImageUrl = mediaImageUrl;
    const oldKey = oldImageUrl ? oldImageUrl.match(/products\/[a-f0-9-]+\.(jpe?g|png|webp)$/i)?.[0] : null;

    try {
      // 1. Upload new image first
      const uploadRes = await adminApi.uploadMedia(selectedFile);
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error("Upload failed to return a valid URL.");
      }

      // 2. Persist new product.imageUrl to PostgreSQL
      await adminApi.updateProduct(productId, {
        imageUrl: uploadRes.url,
      });

      // 3. Only after successful persistence, attempt to delete old object
      if (oldKey && oldKey !== uploadRes.key) {
        try {
          await adminApi.deleteMedia(oldKey);
        } catch (delErr) {
          // Failure to delete old object must not destroy the new image
          console.warn("Storage cleanup notice (old object not deleted):", delErr);
        }
      }

      // 4. Update UI state
      setMediaImageUrl(uploadRes.url);
      setSelectedFile(null);
      setSelectedFileName(null);
      if (localFilePreview) {
        URL.revokeObjectURL(localFilePreview);
        setLocalFilePreview(null);
      }
      setMediaSuccess("Product image uploaded and saved successfully!");
      fetchProductData();
      setTimeout(() => setMediaSuccess(null), 4000);
    } catch (err: any) {
      setMediaError(err?.message || "Failed to upload and save product image.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Remove image from product and cleanup storage (Task 13: Remove Image)
  const handleRemoveMedia = async () => {
    setUploadingMedia(true);
    setMediaError(null);
    setMediaSuccess(null);
    const oldImageUrl = mediaImageUrl;
    const oldKey = oldImageUrl ? oldImageUrl.match(/products\/[a-f0-9-]+\.(jpe?g|png|webp)$/i)?.[0] : null;

    try {
      // 1. Clear product.imageUrl through existing product API first
      await adminApi.updateProduct(productId, {
        imageUrl: null,
      });

      // 2. After successful persistence, attempt storage deletion
      if (oldKey) {
        try {
          await adminApi.deleteMedia(oldKey);
        } catch (delErr) {
          console.warn("Storage deletion cleanup warning:", delErr);
        }
      }

      // 3. Update UI state
      setMediaImageUrl("");
      setSelectedFile(null);
      setSelectedFileName(null);
      if (localFilePreview) {
        URL.revokeObjectURL(localFilePreview);
        setLocalFilePreview(null);
      }
      setMediaSuccess("Product image removed successfully.");
      fetchProductData();
      setTimeout(() => setMediaSuccess(null), 4000);
    } catch (err: any) {
      setMediaError(err?.message || "Failed to remove product image.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSaveMedia = async () => {
    setSavingSection("media");
    setMediaError(null);
    setMediaSuccess(null);
    try {
      await adminApi.updateProduct(productId, {
        imageUrl: mediaImageUrl.trim() || null,
      });
      setMediaSuccess("Product media URL updated successfully.");
      fetchProductData();
      setTimeout(() => setMediaSuccess(null), 3000);
    } catch (err: any) {
      setMediaError(err?.message || "Failed to save media.");
    } finally {
      setSavingSection(null);
    }
  };

  // Save Tab 3: Details & Specs
  const handleSaveDetails = async () => {
    setSavingSection("details");
    setError(null);
    try {
      const specsObj: Record<string, any> = {};
      specsList.forEach((s) => {
        if (s.key.trim()) specsObj[s.key.trim()] = s.value.trim();
      });
      if (features.length > 0) specsObj.features = features;
      if (howToUse.trim()) specsObj.howToUse = howToUse.trim();
      if (basicProductType) specsObj.productType = basicProductType;

      await adminApi.updateProduct(productId, { specs: specsObj });
      setActionSuccess("Product details and specifications saved.");
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save details.");
    } finally {
      setSavingSection(null);
    }
  };

  const addFeature = () => {
    if (newFeatureText.trim()) {
      setFeatures([...features, newFeatureText.trim()]);
      setNewFeatureText("");
    }
  };

  const removeFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const addSpecRow = () => {
    setSpecsList([...specsList, { key: "", value: "" }]);
  };

  const updateSpecRow = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...specsList];
    updated[idx][field] = val;
    setSpecsList(updated);
  };

  const removeSpecRow = (idx: number) => {
    setSpecsList(specsList.filter((_, i) => i !== idx));
  };

  // Tab 4: Variants Management
  const openAddVariantModal = () => {
    setEditingVariant(null);
    setVariantFormData({
      name: "",
      duration: "1 Month",
      originalPrice: "",
      sellingPrice: "",
      costPrice: "",
      stock: 100,
      isActive: true,
      sortOrder: (variants.length + 1) * 10,
    });
    setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (v: VariantItem) => {
    setEditingVariant(v);
    setVariantFormData({
      name: v.name,
      duration: v.duration,
      originalPrice: v.originalPrice || "",
      sellingPrice: v.sellingPrice,
      costPrice: v.costPrice || "",
      stock: v.stock,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    });
    setIsVariantModalOpen(true);
  };

  const handleSaveVariant = async () => {
    if (!variantFormData.name.trim()) {
      alert("Variant name is required");
      return;
    }
    if (!variantFormData.duration.trim()) {
      alert("Duration is required");
      return;
    }
    const priceRegex = /^\d+(\.\d{1,2})?$/;
    if (!priceRegex.test(variantFormData.sellingPrice) || Number(variantFormData.sellingPrice) <= 0) {
      alert("Selling price must be a valid positive amount");
      return;
    }

    try {
      if (editingVariant) {
        await adminApi.updateVariant(productId, editingVariant.id, {
          name: variantFormData.name.trim(),
          duration: variantFormData.duration.trim(),
          originalPrice: variantFormData.originalPrice.trim() || null,
          sellingPrice: variantFormData.sellingPrice.trim(),
          costPrice: variantFormData.costPrice.trim() || null,
          stock: Number(variantFormData.stock) || 0,
          isActive: variantFormData.isActive,
          sortOrder: Number(variantFormData.sortOrder) || 10,
        });
        setActionSuccess(`Variant '${variantFormData.name}' updated.`);
      } else {
        await adminApi.createVariant(productId, {
          name: variantFormData.name.trim(),
          duration: variantFormData.duration.trim(),
          originalPrice: variantFormData.originalPrice.trim() || null,
          sellingPrice: variantFormData.sellingPrice.trim(),
          costPrice: variantFormData.costPrice.trim() || null,
          stock: Number(variantFormData.stock) || 100,
          isActive: variantFormData.isActive,
          sortOrder: Number(variantFormData.sortOrder) || 10,
        });
        setActionSuccess(`Variant '${variantFormData.name}' created.`);
      }

      setIsVariantModalOpen(false);
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save variant.");
    }
  };

  const handleToggleVariantStatus = async (v: VariantItem) => {
    try {
      await adminApi.updateVariantStatus(productId, v.id, !v.isActive);
      setActionSuccess(`Variant '${v.name}' set to ${!v.isActive ? "ACTIVE" : "INACTIVE"}.`);
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update variant status.");
    }
  };

  const handleDeleteVariant = async (v: VariantItem) => {
    if (!confirm(`Are you sure you want to delete variant '${v.name}'? This cannot be undone.`)) {
      return;
    }
    try {
      await adminApi.deleteVariant(productId, v.id);
      setActionSuccess(`Variant '${v.name}' deleted.`);
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Cannot delete variant (may be referenced in historical orders).");
    }
  };

  // Tab 5: Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection("pricing");
    setError(null);

    const priceRegex = /^\d+(\.\d{1,2})?$/;
    if (!priceRegex.test(priceSelling) || Number(priceSelling) <= 0) {
      setError("Selling price must be a valid positive amount (e.g. 499.00)");
      setSavingSection(null);
      return;
    }

    try {
      await adminApi.updateProduct(productId, {
        sellingPrice: priceSelling.trim(),
        originalPrice: priceOriginal.trim() || null,
        costPrice: priceCost.trim() || null,
        currency: priceCurrency,
      });

      setActionSuccess("Authoritative pricing updated successfully.");
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update pricing.");
    } finally {
      setSavingSection(null);
    }
  };

  // Tab 6: Resources Management
  const handleCreateResource = async () => {
    if (!resourceFormData.name.trim() || !resourceFormData.url.trim()) {
      alert("Name and URL are required");
      return;
    }

    try {
      await adminApi.createResource({
        productId,
        name: resourceFormData.name.trim(),
        type: resourceFormData.type,
        purpose: resourceFormData.purpose || undefined,
        url: resourceFormData.url.trim(),
        status: "ACTIVE",
      });

      setIsResourceModalOpen(false);
      setResourceFormData({ name: "", type: "DOCS", url: "", purpose: "Setup documentation" });
      setActionSuccess("Resource linked to product.");
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to create resource.");
    }
  };

  const handleDeleteResource = async (r: ResourceItem) => {
    if (!confirm(`Delete resource '${r.name}'?`)) return;
    try {
      await adminApi.deleteResource(r.id);
      setActionSuccess("Resource deleted.");
      fetchProductData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete resource.");
    }
  };

  const liveDiscount = calculateDiscount(priceOriginal, priceSelling);
  const currentCategory = categories.find((c) => c.id === basicCategoryId);
  const currentProvider = providers.find((p) => p.id === basicProviderId);

  if (loading) {
    return (
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00c2ff]" />
        <span className="text-xs text-gray-400 font-mono">
          Loading product configuration from PostgreSQL...
        </span>
      </div>
    );
  }

  if (!product && !loading) {
    return (
      <div className="bg-[#0b0e17] border border-red-500/20 rounded-2xl p-12 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-gray-400">The requested product ID does not exist in the database.</p>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#00c2ff]" />
                <span>{product.name}</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[#00c2ff]">
                {product.slug}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>Category: <strong className="text-gray-300">{currentCategory ? `${currentCategory.icon || ""} ${currentCategory.name}` : "Uncategorized"}</strong></span>
              <span>•</span>
              <span>Provider: <strong className="text-gray-300">{currentProvider ? currentProvider.name : "Direct"}</strong></span>
              <span>•</span>
              <span>Variants: <strong className="text-gray-300">{variants.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Actions (Status Selector + Refresh) */}
        <div className="flex items-center gap-2">
          <select
            value={basicStatus}
            onChange={(e) => handleQuickStatusChange(e.target.value)}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition-all ${
              basicStatus === "ACTIVE"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : basicStatus === "OUT_OF_STOCK"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <option value="ACTIVE" className="bg-[#0b0e17] text-emerald-400">ACTIVE</option>
            <option value="DISABLED" className="bg-[#0b0e17] text-gray-400">DISABLED</option>
            <option value="OUT_OF_STOCK" className="bg-[#0b0e17] text-amber-400">OUT_OF_STOCK</option>
            <option value="DISCONTINUED" className="bg-[#0b0e17] text-red-400">DISCONTINUED</option>
          </select>

          <button
            onClick={fetchProductData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Reload from DB"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Operation Error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 overflow-x-auto gap-1">
        {[
          { key: "basic", label: "Basic Info", icon: Info },
          { key: "media", label: "Media", icon: ImageIcon },
          { key: "details", label: "Details & Specs", icon: Sliders },
          { key: "variants", label: `Variants & Plans (${variants.length})`, icon: Layers },
          { key: "pricing", label: "Pricing & Economics", icon: DollarSign },
          { key: "resources", label: `Resources (${resources.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                isActive
                  ? "border-[#00c2ff] text-[#00c2ff] bg-white/[0.02]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/[0.01]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BASIC INFORMATION */}
      {activeTab === "basic" && (
        <form onSubmit={handleSaveBasicInfo} className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#00c2ff]" />
                <span>Basic Identity &amp; Categorization</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Authoritative identity parameters in PostgreSQL</p>
            </div>
            <button
              type="submit"
              disabled={savingSection === "basic"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
            >
              {savingSection === "basic" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Basic Info</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={basicName}
                onChange={(e) => setBasicName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Slug *
              </label>
              <input
                type="text"
                required
                value={basicSlug}
                onChange={(e) => setBasicSlug(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#00c2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Category *
              </label>
              <select
                value={basicCategoryId}
                onChange={(e) => setBasicCategoryId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0b0e17] text-white">
                    {cat.icon ? `${cat.icon} ` : ""}{cat.name} ({cat.slug}){cat.isActive === false ? " — [Legacy Inactive]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Product Type
              </label>
              <input
                type="text"
                value={basicProductType}
                onChange={(e) => setBasicProductType(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={basicSortOrder}
                onChange={(e) => setBasicSortOrder(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Upstream Provider
              </label>
              <select
                value={basicProviderId}
                onChange={(e) => setBasicProviderId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="" className="bg-[#0b0e17] text-gray-400">None (Direct Offering)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0b0e17] text-white">
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Provider Product ID
              </label>
              <input
                type="text"
                value={basicProviderProductId}
                onChange={(e) => setBasicProviderProductId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Short Description (Summary Tagline)
              </label>
              <input
                type="text"
                value={basicShortDescription}
                onChange={(e) => setBasicShortDescription(e.target.value)}
                placeholder="Brief summary tagline displayed on catalog cards"
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Full Description
              </label>
              <textarea
                rows={4}
                value={basicDescription}
                onChange={(e) => setBasicDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PRODUCT MEDIA */}
      {activeTab === "media" && (
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#00c2ff]" />
                <span>Product Media &amp; Visuals (Optional)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload official product images to storage or manage the authoritative image URL.
              </p>
            </div>
            <button
              onClick={handleSaveMedia}
              disabled={savingSection === "media" || uploadingMedia}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-all disabled:opacity-50"
            >
              {savingSection === "media" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Manual URL</span>
            </button>
          </div>

          {/* Validation & Storage Notice */}
          <div className="p-3.5 rounded-xl bg-[#00c2ff]/10 border border-[#00c2ff]/20 text-blue-200 text-xs flex items-start gap-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#00c2ff]" />
            <div className="space-y-1">
              <span className="font-semibold block text-white">
                Pluggable Storage &amp; Automatic Replacement
              </span>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Supported formats: <strong>JPEG, PNG, WebP</strong> (Max 5 MB). SVG is rejected.
                Uploading a new image automatically persists it to PostgreSQL and safely cleans up the old storage key.
              </p>
            </div>
          </div>

          {/* Success Notification */}
          {mediaSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{mediaSuccess}</span>
            </div>
          )}

          {/* Error Notification */}
          {mediaError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{mediaError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4 text-xs">
              {/* File Upload Selector */}
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  {mediaImageUrl ? "Replace Product Image" : "Upload Product Image"}
                </label>
                <div className="relative border border-dashed border-white/15 hover:border-[#00c2ff]/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white/[0.01]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    disabled={uploadingMedia}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-300 font-medium truncate max-w-xs">
                      {selectedFileName ? selectedFileName : "Choose an image file (JPEG, PNG, WebP)"}
                    </span>
                    <span className="text-[10px] text-gray-500">Max 5 MB • SVG is prohibited</span>
                  </div>
                </div>
              </div>

              {/* Upload & Save Button (when file selected) */}
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadAndSave}
                  disabled={uploadingMedia}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
                >
                  {uploadingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mediaImageUrl ? "Replacing and storing image..." : "Uploading to storage..."}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{mediaImageUrl ? "Upload & Replace Image" : "Upload & Save to Product"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Authoritative URL Input */}
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Authoritative Image URL
                </label>
                <input
                  type="url"
                  value={mediaImageUrl}
                  onChange={(e) => setMediaImageUrl(e.target.value)}
                  placeholder="https://... (populated on upload or enter external URL)"
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Persisted to PostgreSQL <code>products.imageUrl</code>
                </span>
              </div>

              {/* Remove Image Action */}
              {mediaImageUrl && (
                <div className="pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    disabled={uploadingMedia}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors disabled:opacity-50"
                  >
                    {uploadingMedia ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Remove Image from Product</span>
                  </button>
                  <span className="text-[10px] text-gray-500 mt-1.5 block">
                    Clears <code>products.imageUrl</code> in database and deletes object from storage.
                  </span>
                </div>
              )}
            </div>

            {/* Visual Preview Area */}
            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Visual Preview
              </label>
              <div className="aspect-video w-full rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center overflow-hidden relative">
                {selectedFile && localFilePreview ? (
                  <div className="relative w-full h-full group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={localFilePreview}
                      alt="New selection preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                      New File Selected — Click &quot;Upload &amp; Save&quot; to Persist
                    </div>
                  </div>
                ) : mediaImageUrl ? (
                  <div className="relative w-full h-full group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaImageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as any).src = "";
                        (e.target as any).style.display = "none";
                      }}
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-emerald-500/30 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Persisted Product Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500 p-6 text-center">
                    <ImageIcon className="w-8 h-8 stroke-1 text-gray-600" />
                    <span className="text-xs font-medium text-gray-400">No Image Configured</span>
                    <span className="text-[10px] text-gray-600 max-w-xs">
                      Product currently renders cleanly with its category icon in customer marketplace listings.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETAILS & SPECS */}
      {activeTab === "details" && (
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00c2ff]" />
                <span>Details, Highlights &amp; Technical Specs</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Stored inside PostgreSQL `specs` JSON column</p>
            </div>
            <button
              onClick={handleSaveDetails}
              disabled={savingSection === "details"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
            >
              {savingSection === "details" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Details</span>
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">
              Key Features List
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="e.g., Guaranteed 99.9% Network SLA"
                className="flex-1 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00c2ff] shrink-0" />
                  <span>{feat}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFeature(idx)}
                  className="text-gray-500 hover:text-red-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Technical Specs Key-Value */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-gray-400 uppercase">
                Hardware / Technical Specs
              </label>
              <button
                type="button"
                onClick={addSpecRow}
                className="flex items-center gap-1 text-[11px] text-[#00c2ff] hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Add Spec</span>
              </button>
            </div>

            {specsList.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={spec.key}
                  onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                  placeholder="Key (e.g. RAM, CPU, Storage)"
                  className="w-1/3 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => updateSpecRow(idx, "value", e.target.value)}
                  placeholder="Value (e.g. 16GB DDR4, 4 vCPU)"
                  className="flex-1 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(idx)}
                  className="p-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* How to Use */}
          <div className="space-y-2 pt-3 border-t border-white/5">
            <label className="block text-[11px] font-mono text-gray-400 uppercase">
              How To Use / Provisioning Instructions
            </label>
            <textarea
              rows={3}
              value={howToUse}
              onChange={(e) => setHowToUse(e.target.value)}
              className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* TAB 4: VARIANTS & PLANS */}
      {activeTab === "variants" && (
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00c2ff]" />
                <span>Product Variants &amp; Tiered Plans ({variants.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Authoritative tiered offerings with independent pricing and duration commitments.
              </p>
            </div>
            <button
              onClick={openAddVariantModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-colors shrink-0 shadow-[0_0_15px_rgba(0,194,255,0.25)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>

          {/* Zero-Variant State (Preserves zero variants for legacy products, does not invent fake Standard/Lifetime) */}
          {variants.length === 0 ? (
            <div className="py-12 px-4 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
              <Layers className="w-8 h-8 text-gray-600 stroke-1" />
              <span className="text-xs font-semibold text-gray-300">0 Variants Configured</span>
              <p className="text-[11px] text-gray-500 max-w-md">
                This product currently has zero variants in the database. It operates as a single-tier offering using the product-level baseline pricing.
                Click &quot;Add Variant&quot; above to configure tiered plans at any time.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] font-mono uppercase text-gray-400">
                  <tr>
                    <th className="py-3 px-3">Variant Name</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Selling Price</th>
                    <th className="py-3 px-3">List Price</th>
                    <th className="py-3 px-3">Discount</th>
                    <th className="py-3 px-3">Provider Cost</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {variants.map((v) => {
                    const disc = calculateDiscount(v.originalPrice || "", v.sellingPrice);
                    return (
                      <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {v.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-400 text-[11px]">
                          {v.duration}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                          ₹{Number(v.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-400">
                          {v.originalPrice ? (
                            <span className="line-through">
                              ₹{Number(v.originalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {disc ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                              {disc}% OFF
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">None</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-400 text-[11px]">
                          {v.costPrice ? (
                            `₹${Number(v.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-gray-600">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-300">
                          {v.stock}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleVariantStatus(v)}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                              v.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20"
                            }`}
                            title="Click to toggle variant active status"
                          >
                            {v.isActive ? "ACTIVE" : "INACTIVE"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditVariantModal(v)}
                              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="Edit Variant"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                              title="Delete Variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add / Edit Variant Modal */}
          {isVariantModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00c2ff]" />
                    <h3 className="text-sm font-bold text-white">
                      {editingVariant ? "Edit Variant" : "Add Plan / Variant"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVariantModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Variant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={variantFormData.name}
                      onChange={(e) =>
                        setVariantFormData({ ...variantFormData, name: e.target.value })
                      }
                      placeholder="e.g., Basic, Standard, Premium"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                        Duration *
                      </label>
                      <input
                        type="text"
                        required
                        value={variantFormData.duration}
                        onChange={(e) =>
                          setVariantFormData({ ...variantFormData, duration: e.target.value })
                        }
                        placeholder="e.g., 1 Month, 1 Year"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={variantFormData.stock}
                        onChange={(e) =>
                          setVariantFormData({
                            ...variantFormData,
                            stock: Number(e.target.value),
                          })
                        }
                        className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="text"
                        required
                        value={variantFormData.sellingPrice}
                        onChange={(e) =>
                          setVariantFormData({
                            ...variantFormData,
                            sellingPrice: e.target.value,
                          })
                        }
                        placeholder="e.g., 700.00"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                        Original / List Price (₹)
                      </label>
                      <input
                        type="text"
                        value={variantFormData.originalPrice}
                        onChange={(e) =>
                          setVariantFormData({
                            ...variantFormData,
                            originalPrice: e.target.value,
                          })
                        }
                        placeholder="e.g., 1500.00"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {calculateDiscount(variantFormData.originalPrice, variantFormData.sellingPrice) && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                      <span>Live Discount Preview:</span>
                      <span className="font-mono font-bold">
                        {calculateDiscount(variantFormData.originalPrice, variantFormData.sellingPrice)}% OFF
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Provider Cost (Admin Internal)
                    </label>
                    <input
                      type="text"
                      value={variantFormData.costPrice}
                      onChange={(e) =>
                        setVariantFormData({
                          ...variantFormData,
                          costPrice: e.target.value,
                        })
                      }
                      placeholder="e.g., 350.00"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="variantIsActiveModal"
                      checked={variantFormData.isActive}
                      onChange={(e) =>
                        setVariantFormData({
                          ...variantFormData,
                          isActive: e.target.checked,
                        })
                      }
                      className="rounded border-white/20 bg-black text-[#00c2ff] focus:ring-0"
                    />
                    <label htmlFor="variantIsActiveModal" className="text-xs text-gray-300">
                      Variant Active (Orderable by customers)
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsVariantModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVariant}
                    className="px-4 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black text-xs font-bold"
                  >
                    Save Variant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PRICING & ECONOMICS */}
      {activeTab === "pricing" && (
        <form onSubmit={handleSavePricing} className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#00c2ff]" />
                <span>Authoritative Pricing &amp; Economics</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Product-level baseline pricing in PostgreSQL</p>
            </div>
            <button
              type="submit"
              disabled={savingSection === "pricing"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
            >
              {savingSection === "pricing" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Pricing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="text"
                  required
                  value={priceSelling}
                  onChange={(e) => setPriceSelling(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Original / List Price (₹)
                </label>
                <input
                  type="text"
                  value={priceOriginal}
                  onChange={(e) => setPriceOriginal(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Displayed with strike-through to establish discount
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Provider Cost (Admin Internal)
                </label>
                <input
                  type="text"
                  value={priceCost}
                  onChange={(e) => setPriceCost(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={priceCurrency}
                  disabled
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-400 font-mono"
                />
              </div>
            </div>

            {/* Economics Preview Card */}
            <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-5 space-y-4">
              <span className="text-[11px] font-mono text-gray-400 uppercase block tracking-wider">
                Economics Live Verification
              </span>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-gray-400">List Price:</span>
                  <span className="font-mono text-gray-300">
                    {priceOriginal ? `₹${Number(priceOriginal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-gray-400">Selling Price:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ₹{Number(priceSelling || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-gray-400">Upstream Cost:</span>
                  <span className="font-mono text-amber-400">
                    {priceCost ? `₹${Number(priceCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "N/A"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">
                    Calculated Discount
                  </span>
                  {liveDiscount ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {liveDiscount}% OFF
                      </span>
                      <span className="text-[11px] text-emerald-400/80">
                        (Save ₹{(Number(priceOriginal) - Number(priceSelling)).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {Number(priceSelling) >= Number(priceOriginal) && Number(priceOriginal) > 0
                        ? "Selling price ≥ List price (No discount)"
                        : "No discount applied."}
                    </span>
                  )}
                </div>

                {priceSelling && priceCost && Number(priceSelling) > 0 && Number(priceCost) > 0 && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                    <span className="text-[10px] font-mono text-[#00c2ff] uppercase block">
                      Admin Margin
                    </span>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-white font-bold">
                        ₹{(Number(priceSelling) - Number(priceCost)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[#00c2ff]">
                        {(((Number(priceSelling) - Number(priceCost)) / Number(priceSelling)) * 100).toFixed(2)}% margin
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 6: RESOURCES */}
      {activeTab === "resources" && (
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00c2ff]" />
                <span>Documentation &amp; Tutorial Resources ({resources.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Centralized platform resources linked to this product in PostgreSQL.
              </p>
            </div>
            <button
              onClick={() => setIsResourceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-colors shrink-0 shadow-[0_0_15px_rgba(0,194,255,0.25)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Resource</span>
            </button>
          </div>

          {resources.length === 0 ? (
            <div className="py-12 px-4 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
              <FileText className="w-8 h-8 text-gray-600 stroke-1" />
              <span className="text-xs font-semibold text-gray-300">No Resources Linked</span>
              <p className="text-[11px] text-gray-500 max-w-md">
                No tutorials or documentation links are linked to this product yet.
                Click &quot;Link Resource&quot; to add guides or support links.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] font-mono uppercase text-gray-400">
                  <tr>
                    <th className="py-3 px-3">Resource Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">URL</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {resources.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{r.name}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-[11px]">{r.purpose || "—"}</td>
                      <td className="py-3 px-3 font-mono">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00c2ff] hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-xs">{r.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(r)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Resource Modal */}
          {isResourceModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#00c2ff]" />
                    <h3 className="text-sm font-bold text-white">Link New Resource</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResourceModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Resource Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={resourceFormData.name}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, name: e.target.value })
                      }
                      placeholder="e.g., Node Setup & Firewall Guide"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Resource Type
                    </label>
                    <select
                      value={resourceFormData.type}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, type: e.target.value })
                      }
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="DOCS">DOCS — Technical Documentation</option>
                      <option value="GUIDE">GUIDE — Step-by-step Tutorial</option>
                      <option value="VIDEO">VIDEO — Video Tutorial</option>
                      <option value="SUPPORT">SUPPORT — Support Link</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={resourceFormData.url}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, url: e.target.value })
                      }
                      placeholder="https://docs.example.com/..."
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Purpose / Note
                    </label>
                    <input
                      type="text"
                      value={resourceFormData.purpose}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, purpose: e.target.value })
                      }
                      placeholder="e.g., Quick-start guide for new buyers"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsResourceModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateResource}
                    className="px-4 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black text-xs font-bold"
                  >
                    Save Resource
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
