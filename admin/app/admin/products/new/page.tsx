"use client";

import React, { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import {
  Package,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Info,
  DollarSign,
  Layers,
  FileText,
  Sliders,
  ExternalLink,
  Tag,
  ShieldCheck,
  Server,
  FolderPlus,
} from "lucide-react";

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

interface ProviderOption {
  id: string;
  code: string;
  name: string;
}

interface VariantItem {
  id?: string;
  tempId: string;
  name: string;
  duration: string;
  originalPrice: string;
  sellingPrice: string;
  costPrice: string;
  specs: Record<string, string>;
  stock: number;
  isActive: boolean;
  sortOrder: number;
}

interface ResourceItem {
  tempId: string;
  name: string;
  type: string;
  url: string;
  purpose: string;
}

const STEPS = [
  { id: 1, label: "Basic Info", icon: Info },
  { id: 2, label: "Media", icon: ImageIcon },
  { id: 3, label: "Details", icon: Sliders },
  { id: 4, label: "Variants", icon: Layers },
  { id: 5, label: "Pricing", icon: DollarSign },
  { id: 6, label: "Review & Save", icon: CheckCircle2 },
];

export default function NewProductWizardPage() {
  const router = useRouter();

  // Steps state
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Dynamic dropdown dependencies from real APIs
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  // Step 1: Basic Information
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("Hosting");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [sortOrder, setSortOrder] = useState(10);
  const [providerId, setProviderId] = useState("");
  const [providerProductId, setProviderProductId] = useState("");

  // Step 2: Media
  const [imageUrl, setImageUrl] = useState("");
  const [localFilePreview, setLocalFilePreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaUploadSuccess, setMediaUploadSuccess] = useState<string | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  // Step 3: Details & Specs
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [specsList, setSpecsList] = useState<Array<{ key: string; value: string }>>([
    { key: "Platform", value: "Linux / KVM" },
    { key: "Uptime SLA", value: "99.9%" },
  ]);
  const [howToUse, setHowToUse] = useState("");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceType, setNewResourceType] = useState("DOCS");
  const [newResourceUrl, setNewResourceUrl] = useState("");

  // Step 4: Variants
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantFormData, setVariantFormData] = useState<VariantItem>({
    tempId: "",
    name: "",
    duration: "1 Month",
    originalPrice: "",
    sellingPrice: "",
    costPrice: "",
    specs: {},
    stock: 100,
    isActive: true,
    sortOrder: 10,
  });

  // Step 5: Pricing (Product level)
  const [originalPrice, setOriginalPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("499.00");
  const [costPrice, setCostPrice] = useState("250.00");
  const [currency, setCurrency] = useState("INR");

  // Add New Category Modal State (Step 1 convenience)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [categoryCreatedSuccess, setCategoryCreatedSuccess] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    slugManuallyEdited: false,
    icon: "🌐",
    description: "",
    sortOrder: 70,
    isActive: true,
  });

  // Reusable active categories loader from authoritative database
  const fetchActiveCategories = async (selectId?: string) => {
    try {
      const catsRes = await adminApi.getCategories({ isActive: true });
      if (catsRes && catsRes.categories) {
        const activeOnly = catsRes.categories.filter((c) => c.isActive !== false);
        setCategories(activeOnly);
        if (selectId) {
          setCategoryId(selectId);
        } else if (activeOnly.length > 0) {
          setCategoryId((prev) => (prev ? prev : activeOnly[0].id));
        }
        return activeOnly;
      }
    } catch (err: any) {
      console.error("Failed to load categories:", err);
    }
    return [];
  };

  const openNewCategoryModal = () => {
    setCategoryModalError(null);
    setCategoryFormData({
      name: "",
      slug: "",
      slugManuallyEdited: false,
      icon: "🌐",
      description: "",
      sortOrder: (categories.length + 1) * 10,
      isActive: true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleNewCategoryNameChange = (val: string) => {
    setCategoryFormData((prev) => {
      const next = { ...prev, name: val };
      if (!prev.slugManuallyEdited) {
        next.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
      return next;
    });
  };

  const handleNewCategorySlugChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setCategoryFormData((prev) => ({
      ...prev,
      slug: cleaned,
      slugManuallyEdited: true,
    }));
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = categoryFormData.name.trim();
    const trimmedSlug = categoryFormData.slug.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setCategoryModalError("Category name must be at least 2 characters.");
      return;
    }
    if (!trimmedSlug || trimmedSlug.length < 2) {
      setCategoryModalError("Slug must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setCategoryModalError("Slug must only contain lowercase letters, numbers, and hyphens.");
      return;
    }

    setCategorySubmitting(true);
    setCategoryModalError(null);

    try {
      // 1. Authoritative creation via existing admin API
      const res = await adminApi.createCategory({
        name: trimmedName,
        slug: trimmedSlug,
        description: categoryFormData.description.trim() || undefined,
        icon: categoryFormData.icon.trim() || undefined,
        sortOrder: Number(categoryFormData.sortOrder) || 0,
        isActive: categoryFormData.isActive,
      });

      const newCategory = res?.category;

      // 2. Refresh active categories from backend & auto-select new category
      await fetchActiveCategories(newCategory?.id);

      // 3. Clear any existing step error on category
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next.category;
        return next;
      });

      // 4. Close modal & show success feedback
      setIsCategoryModalOpen(false);
      if (categoryFormData.isActive) {
        setCategoryCreatedSuccess(`Category "${trimmedName}" created and automatically selected.`);
      } else {
        setCategoryCreatedSuccess(`Category "${trimmedName}" created (Inactive - legacy preserved).`);
      }
      setTimeout(() => setCategoryCreatedSuccess(null), 5000);
    } catch (err: any) {
      console.error("Create category error:", err);
      if (err?.message?.includes("already exists") || err?.statusCode === 409) {
        setCategoryModalError(`A category with slug "${trimmedSlug}" already exists.`);
      } else if (err?.message) {
        setCategoryModalError(err.message);
      } else {
        setCategoryModalError("Unable to create category. Please check backend connection and try again.");
      }
    } finally {
      setCategorySubmitting(false);
    }
  };

  // Load real categories and providers on mount
  useEffect(() => {
    async function loadDependencies() {
      setLoadingDependencies(true);
      try {
        const [catsRes, provsRes] = await Promise.all([
          adminApi.getCategories({ isActive: true }),
          adminApi.getProviders(),
        ]);

        if (catsRes && catsRes.categories) {
          // Strictly active categories for new marketplace offerings
          const activeOnly = catsRes.categories.filter((c) => c.isActive !== false);
          setCategories(activeOnly);
          if (activeOnly.length > 0) {
            setCategoryId(activeOnly[0].id);
          }
        }

        if (provsRes && provsRes.providers) {
          setProviders(provsRes.providers);
        }
      } catch (err: any) {
        console.error("Failed to load categories/providers:", err);
        setError("Failed to load authoritative categories or providers from backend.");
      } finally {
        setLoadingDependencies(false);
      }
    }

    loadDependencies();
  }, []);

  // Auto-slugify name if slug has not been manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  // Step 2: Handle Local Image Selection & Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMediaUploadError("File size exceeds 5 MB limit. Please choose a smaller image.");
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setMediaUploadError(null);
      setMediaUploadSuccess(null);
      if (localFilePreview) {
        URL.revokeObjectURL(localFilePreview);
      }
      const preview = URL.createObjectURL(file);
      setLocalFilePreview(preview);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;
    setUploadingImage(true);
    setMediaUploadError(null);
    setMediaUploadSuccess(null);
    try {
      const res = await adminApi.uploadMedia(selectedFile);
      if (res.success && res.url) {
        // If an old key was uploaded in this wizard session, attempt cleanup
        if (uploadedKey && uploadedKey !== res.key) {
          adminApi.deleteMedia(uploadedKey).catch((e) => console.warn("Cleanup old key warning:", e));
        }
        setImageUrl(res.url);
        setUploadedKey(res.key);
        setMediaUploadSuccess("Image uploaded successfully to server storage!");
        if (localFilePreview) {
          URL.revokeObjectURL(localFilePreview);
          setLocalFilePreview(null);
        }
        setSelectedFile(null);
      } else {
        setMediaUploadError("Upload completed but no public URL was returned.");
      }
    } catch (err: any) {
      setMediaUploadError(err?.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    const keyToDelete = uploadedKey || (imageUrl.match(/products\/[a-f0-9-]+\.(jpe?g|png|webp)$/i)?.[0]);
    if (keyToDelete) {
      try {
        await adminApi.deleteMedia(keyToDelete);
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }
    if (localFilePreview) {
      URL.revokeObjectURL(localFilePreview);
    }
    setLocalFilePreview(null);
    setSelectedFile(null);
    setSelectedFileName(null);
    setImageUrl("");
    setUploadedKey(null);
    setMediaUploadSuccess(null);
    setMediaUploadError(null);
  };

  // Step 3: Feature & Specs Handlers
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

  const addResource = () => {
    if (newResourceName.trim() && newResourceUrl.trim()) {
      setResources([
        ...resources,
        {
          tempId: `res-${Date.now()}`,
          name: newResourceName.trim(),
          type: newResourceType,
          url: newResourceUrl.trim(),
          purpose: "Product documentation / tutorial",
        },
      ]);
      setNewResourceName("");
      setNewResourceUrl("");
    }
  };

  const removeResource = (tempId: string) => {
    setResources(resources.filter((r) => r.tempId !== tempId));
  };

  // Step 4: Variant Handlers
  const openAddVariantModal = () => {
    setEditingVariantIndex(null);
    setVariantFormData({
      tempId: `var-${Date.now()}`,
      name: "",
      duration: "1 Month",
      originalPrice: "",
      sellingPrice: "",
      costPrice: "",
      specs: {},
      stock: 100,
      isActive: true,
      sortOrder: (variants.length + 1) * 10,
    });
    setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (index: number) => {
    setEditingVariantIndex(index);
    setVariantFormData({ ...variants[index] });
    setIsVariantModalOpen(true);
  };

  const saveVariant = () => {
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
      alert("Selling price must be a valid positive number (e.g. 499.00)");
      return;
    }
    if (variantFormData.originalPrice && !priceRegex.test(variantFormData.originalPrice)) {
      alert("Original price must be a valid monetary amount (e.g. 999.00)");
      return;
    }
    if (variantFormData.costPrice && !priceRegex.test(variantFormData.costPrice)) {
      alert("Provider cost must be a valid monetary amount (e.g. 250.00)");
      return;
    }

    if (editingVariantIndex !== null) {
      const updated = [...variants];
      updated[editingVariantIndex] = { ...variantFormData };
      setVariants(updated);
    } else {
      setVariants([...variants, { ...variantFormData, tempId: `var-${Date.now()}` }]);
    }
    setIsVariantModalOpen(false);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const moveVariant = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= variants.length) return;
    const reordered = [...variants];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    // update sort orders
    reordered.forEach((v, i) => {
      v.sortOrder = (i + 1) * 10;
    });
    setVariants(reordered);
  };

  // Discount Calculation Helper
  const calculateDiscount = (origStr: string, sellStr: string) => {
    const orig = parseFloat(origStr);
    const sell = parseFloat(sellStr);
    if (!orig || !sell || orig <= 0 || sell <= 0 || sell >= orig) {
      return null;
    }
    const percent = ((orig - sell) / orig) * 100;
    return percent.toFixed(2);
  };

  // Validation per step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) errors.name = "Product name is required.";
      if (!slug.trim()) errors.slug = "Product slug is required.";
      if (!categoryId) errors.category = "Category is required. Please select from the list.";
    }

    if (step === 5) {
      const priceRegex = /^\d+(\.\d{1,2})?$/;
      if (!priceRegex.test(sellingPrice) || Number(sellingPrice) <= 0) {
        errors.sellingPrice = "Selling price must be a valid positive amount (e.g. 499.00)";
      }
      if (originalPrice && !priceRegex.test(originalPrice)) {
        errors.originalPrice = "Original price must be a valid monetary amount (e.g. 999.00)";
      }
      if (costPrice && !priceRegex.test(costPrice)) {
        errors.costPrice = "Cost price must be a valid monetary amount (e.g. 250.00)";
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Step 6: Review & Final Save
  const handleSaveProduct = async () => {
    if (!validateStep(1) || !validateStep(5)) {
      setError("Please resolve the validation errors before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build structured specs
      const specsObj: Record<string, any> = {};
      specsList.forEach((s) => {
        if (s.key.trim()) specsObj[s.key.trim()] = s.value.trim();
      });
      if (features.length > 0) {
        specsObj.features = features;
      }
      if (howToUse.trim()) {
        specsObj.howToUse = howToUse.trim();
      }
      if (productType) {
        specsObj.productType = productType;
      }

      // Step 1: Create Product using Phase 3A Admin API
      const createRes = await adminApi.createProduct({
        name: name.trim(),
        slug: slug.trim(),
        categoryId,
        providerId: providerId || null,
        providerProductId: providerProductId.trim() || null,
        description: description.trim() || undefined,
        shortDescription: shortDescription.trim() || null,
        imageUrl: imageUrl.trim() || null,
        originalPrice: originalPrice.trim() || null,
        sellingPrice: sellingPrice.trim(),
        costPrice: costPrice.trim() || null,
        currency: currency || "INR",
        status,
        specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        sortOrder: Number(sortOrder) || 10,
      });

      const createdProduct = createRes?.product;
      if (!createdProduct || !createdProduct.id) {
        throw new Error("Failed to obtain created product ID from Master Backend.");
      }

      // Step 2: Create Variants (if any) via Variant Admin API
      if (variants.length > 0) {
        for (const variant of variants) {
          await adminApi.createVariant(createdProduct.id, {
            name: variant.name.trim(),
            duration: variant.duration.trim(),
            originalPrice: variant.originalPrice.trim() || null,
            sellingPrice: variant.sellingPrice.trim(),
            costPrice: variant.costPrice.trim() || null,
            specs: Object.keys(variant.specs || {}).length > 0 ? variant.specs : undefined,
            stock: Number(variant.stock) || 100,
            isActive: variant.isActive !== false,
            sortOrder: Number(variant.sortOrder) || 10,
          });
        }
      }

      // Step 3: Create Resources (if any) via Resource Admin API
      if (resources.length > 0) {
        for (const res of resources) {
          await adminApi.createResource({
            productId: createdProduct.id,
            name: res.name.trim(),
            type: res.type,
            purpose: res.purpose || undefined,
            url: res.url.trim(),
            status: "ACTIVE",
          });
        }
      }

      // Redirect to Dedicated Product Detail / Management Page
      router.push(`/admin/products/${createdProduct.id}`);
    } catch (err: any) {
      console.error("Save product error:", err);
      setError(err?.message || "Failed to create product. Check that slug is unique and fields are valid.");
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedProvider = providers.find((p) => p.id === providerId);
  const productDiscount = calculateDiscount(originalPrice, sellingPrice);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#00c2ff]" />
              <span>Product Editor</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00c2ff]/10 border border-[#00c2ff]/20 text-[#00c2ff] font-mono font-medium">
                Phase 3B Wizard
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              6-Step guided configuration for marketplace offerings, real variants, and authoritative pricing
            </p>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Product Editor Error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Indicator */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-3 sm:p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <button
                key={s.id}
                onClick={() => {
                  if (currentStep > s.id || validateStep(currentStep)) {
                    setCurrentStep(s.id);
                  }
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
                  isCurrent
                    ? "bg-[#00c2ff]/10 border border-[#00c2ff]/30 text-[#00c2ff]"
                    : isCompleted
                    ? "bg-white/[0.03] border border-emerald-500/20 text-emerald-400 hover:bg-white/[0.06]"
                    : "bg-white/[0.02] border border-white/5 text-gray-500 opacity-60"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px] font-mono font-bold">0{s.id}</span>
                </div>
                <span className="text-[11px] font-medium truncate w-full">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Dependencies Skeleton */}
      {loadingDependencies ? (
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#00c2ff]" />
          <span className="text-xs text-gray-400 font-mono">
            Loading authoritative categories and providers from PostgreSQL...
          </span>
        </div>
      ) : (
        /* Wizard Steps Content */
        <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 shadow-xl">
          {/* STEP 1: BASIC INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#00c2ff]" />
                  <span>Step 1 — Basic Information</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Core identity, category mapping, and upstream provider configuration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Minecraft Enterprise Node 16GB"
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                  {stepErrors.name && (
                    <span className="text-[11px] text-red-400 mt-1 block">{stepErrors.name}</span>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g., minecraft-enterprise-16gb"
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#00c2ff] placeholder-gray-600 focus:outline-none"
                  />
                  {stepErrors.slug && (
                    <span className="text-[11px] text-red-400 mt-1 block">{stepErrors.slug}</span>
                  )}
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    URL-safe canonical identifier for routing and catalog indexing
                  </span>
                </div>

                {/* Category (Dynamic from DB) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-gray-400 uppercase">
                      Category (Authoritative Database) <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={openNewCategoryModal}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00c2ff] hover:text-[#00c2ff]/80 transition-colors"
                      title="Create a new marketplace category without leaving product creation"
                    >
                      <Plus className="w-3 h-3" />
                      <span>＋ Add New Category</span>
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#0b0e17] text-white">
                        {cat.icon ? `${cat.icon} ` : ""}{cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                  {categoryCreatedSuccess && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{categoryCreatedSuccess}</span>
                    </div>
                  )}
                  {stepErrors.category && (
                    <span className="text-[11px] text-red-400 mt-1 block">{stepErrors.category}</span>
                  )}
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={openNewCategoryModal}
                      className="inline-flex items-center gap-1.5 text-[11px] text-[#00c2ff] hover:text-white px-2.5 py-1 rounded-lg bg-[#00c2ff]/10 hover:bg-[#00c2ff]/20 border border-[#00c2ff]/30 transition-all font-mono"
                    >
                      <Plus className="w-3 h-3" />
                      <span>＋ Add New Category</span>
                    </button>
                  </div>
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Product Type
                  </label>
                  <input
                    type="text"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g., Hosting, VPS, Game Server, Dedicated"
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Status & Availability */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Status / Availability
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="ACTIVE" className="bg-[#0b0e17] text-emerald-400">ACTIVE — Live for purchase</option>
                    <option value="DISABLED" className="bg-[#0b0e17] text-gray-400">DISABLED — Hidden from catalog</option>
                    <option value="OUT_OF_STOCK" className="bg-[#0b0e17] text-amber-400">OUT_OF_STOCK — Visible but not orderable</option>
                    <option value="DISCONTINUED" className="bg-[#0b0e17] text-red-400">DISCONTINUED — Legacy retired</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Lower numbers display first in marketplace listings (10, 20, 30...)
                  </span>
                </div>

                {/* Upstream Provider */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Upstream Provider (Optional)
                  </label>
                  <select
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#0b0e17] text-gray-400">None (Direct In-House Offering)</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0b0e17] text-white">
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider Product ID */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Provider Product / SKU ID
                  </label>
                  <input
                    type="text"
                    value={providerProductId}
                    onChange={(e) => setProviderProductId(e.target.value)}
                    placeholder="e.g., vps-std-2g-sgp1"
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Identifier used when provisioning with automated upstream APIs
                  </span>
                </div>

                {/* Short Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Short Description (Summary Tagline)
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g., Ultra-low latency NVMe Minecraft hosting with enterprise DDoS mitigation."
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>

                {/* Full Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed specifications, included guarantees, hardware architecture, and service scope..."
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Add New Category Modal */}
              {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-[#00c2ff]" />
                        <h3 className="text-sm font-bold text-white">Add New Category</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(false)}
                        disabled={categorySubmitting}
                        className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {categoryModalError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{categoryModalError}</div>
                      </div>
                    )}

                    <form onSubmit={handleCreateCategorySubmit} className="space-y-3.5 text-xs">
                      {/* 1. Category Name */}
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                          Category Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={categoryFormData.name}
                          onChange={(e) => handleNewCategoryNameChange(e.target.value)}
                          placeholder="e.g., Web Development"
                          className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                          autoFocus
                        />
                      </div>

                      {/* 2. Slug */}
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                          URL Slug <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={categoryFormData.slug}
                          onChange={(e) => handleNewCategorySlugChange(e.target.value)}
                          placeholder="e.g., web-development"
                          className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-[#00c2ff] font-mono placeholder-gray-600 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          Lowercase letters, numbers, and hyphens only
                        </span>
                      </div>

                      {/* 3. Icon & 5. Sort Order */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                            Icon (Emoji or text)
                          </label>
                          <input
                            type="text"
                            value={categoryFormData.icon}
                            onChange={(e) =>
                              setCategoryFormData({ ...categoryFormData, icon: e.target.value })
                            }
                            placeholder="e.g., 🌐, 💻, 🚀"
                            className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                            Sort Order
                          </label>
                          <input
                            type="number"
                            value={categoryFormData.sortOrder}
                            onChange={(e) =>
                              setCategoryFormData({
                                ...categoryFormData,
                                sortOrder: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 4. Description */}
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={categoryFormData.description}
                          onChange={(e) =>
                            setCategoryFormData({ ...categoryFormData, description: e.target.value })
                          }
                          placeholder="Website development tools and services."
                          className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none resize-none"
                        />
                      </div>

                      {/* 6. Active Toggle */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="new-product-category-is-active"
                          checked={categoryFormData.isActive}
                          onChange={(e) =>
                            setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })
                          }
                          className="rounded bg-black/50 border-white/10 text-[#00c2ff] focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <label
                          htmlFor="new-product-category-is-active"
                          className="text-xs text-gray-300 cursor-pointer select-none"
                        >
                          Active <span className="text-gray-500 font-normal">(Selectable immediately for new products)</span>
                        </label>
                      </div>

                      {/* Modal Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(false)}
                          disabled={categorySubmitting}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-xs transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={categorySubmitting}
                          className="px-4 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
                        >
                          {categorySubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create Category</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PRODUCT MEDIA */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#00c2ff]" />
                  <span>Step 2 — Product Media (Optional)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Upload an official product visual or leave blank for a clean category fallback.
                </p>
              </div>

              {/* Explanatory Banner regarding storage boundary & format rules */}
              <div className="p-3.5 rounded-xl bg-[#00c2ff]/10 border border-[#00c2ff]/20 text-blue-200 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#00c2ff]" />
                <div className="space-y-1">
                  <span className="font-semibold block text-white">
                    Pluggable Storage &amp; Validation Engine
                  </span>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Allowed formats: <strong>JPEG, PNG, WebP</strong>. Maximum file size: <strong>5 MB</strong>. SVG and invalid signatures are safely rejected.
                    Images are stored via the backend storage driver and persisted to <code>products.imageUrl</code> upon completing the wizard. Product images are completely optional.
                  </p>
                </div>
              </div>

              {/* Success Notification */}
              {mediaUploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{mediaUploadSuccess}</span>
                </div>
              )}

              {/* Error Notification */}
              {mediaUploadError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{mediaUploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Input controls */}
                <div className="space-y-4 text-xs">
                  {/* File Upload Selector */}
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      {imageUrl ? "Replace Image File" : "Choose Image File"}
                    </label>
                    <div className="relative border border-dashed border-white/15 hover:border-[#00c2ff]/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white/[0.01]">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        disabled={uploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-300 font-medium truncate max-w-xs">
                          {selectedFileName ? selectedFileName : "Click or drag to choose an image (JPG, PNG, WebP)"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Max 5 MB • SVG is strictly prohibited
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Upload Action Button */}
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleUploadImage}
                      disabled={uploadingImage}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading to Storage Driver...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload Image to Storage</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Persisted Image URL Input (Populated by upload or manual CDN) */}
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Authoritative Image URL
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setMediaUploadSuccess(null);
                      }}
                      placeholder="Populated automatically upon upload, or enter external CDN URL"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Saved to PostgreSQL <code>products.imageUrl</code> on product creation
                    </span>
                  </div>

                  {/* Remove / Clear Button */}
                  {(imageUrl || localFilePreview || selectedFile) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Image / Clear Selection</span>
                    </button>
                  )}
                </div>

                {/* Right: Visual Preview Area */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Image Preview
                  </label>
                  <div className="aspect-video w-full rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center overflow-hidden relative">
                    {imageUrl ? (
                      <div className="relative w-full h-full group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = "";
                            (e.target as any).style.display = "none";
                          }}
                        />
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-emerald-500/30 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Authoritative Storage URL</span>
                        </div>
                      </div>
                    ) : localFilePreview ? (
                      <div className="relative w-full h-full group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={localFilePreview}
                          alt="Local preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = "";
                            (e.target as any).style.display = "none";
                          }}
                        />
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                          Local Preview — Click &quot;Upload Image to Storage&quot;
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500 p-6 text-center">
                        <ImageIcon className="w-8 h-8 stroke-1 text-gray-600" />
                        <span className="text-xs font-medium text-gray-400">No Image Specified</span>
                        <span className="text-[10px] text-gray-600 max-w-xs">
                          Optional product media. Products without images render cleanly using the official category badge.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRODUCT DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00c2ff]" />
                  <span>Step 3 — Product Details & Specifications</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Structured highlights, key hardware specifications, and documentation links.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-gray-400 uppercase">
                    Key Features & Bullet Points
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Rendered as bullet highlights on product detail cards
                  </span>
                </div>

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
                    placeholder="e.g., Guaranteed 99.9% Network Uptime"
                    className="flex-1 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {features.length > 0 && (
                  <div className="space-y-1.5 pt-1">
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
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Specifications (specs JSON mapping) */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-gray-400 uppercase">
                    Technical Specifications
                  </label>
                  <button
                    type="button"
                    onClick={addSpecRow}
                    className="flex items-center gap-1 text-[11px] text-[#00c2ff] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Spec Row</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {specsList.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                        placeholder="Key (e.g. RAM, CPU, Storage)"
                        className="w-1/3 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => updateSpecRow(idx, "value", e.target.value)}
                        placeholder="Value (e.g. 16GB DDR4 ECC, 4 vCPU)"
                        className="flex-1 bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecRow(idx)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove spec"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Use / Delivery Guide */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="block text-[11px] font-mono text-gray-400 uppercase">
                  How To Use / Provisioning Instructions
                </label>
                <textarea
                  rows={3}
                  value={howToUse}
                  onChange={(e) => setHowToUse(e.target.value)}
                  placeholder="Steps the customer should follow after purchase (e.g., access control panel, configure DNS, connect via SSH)..."
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none resize-none"
                />
              </div>

              {/* Documentation & Resources (Centralized Resource API) */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-gray-400 uppercase">
                    Documentation / Tutorials (Centralized Resource System)
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Persisted via Admin Resource API
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newResourceName}
                    onChange={(e) => setNewResourceName(e.target.value)}
                    placeholder="Title (e.g. Setup Guide)"
                    className="bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newResourceType}
                    onChange={(e) => setNewResourceType(e.target.value)}
                    className="bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="DOCS">DOCS (Documentation)</option>
                    <option value="GUIDE">GUIDE (Step-by-step)</option>
                    <option value="VIDEO">VIDEO (Tutorial)</option>
                    <option value="SUPPORT">SUPPORT (Help Link)</option>
                  </select>
                  <input
                    type="url"
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="https://docs.example.com/..."
                    className="bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addResource}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Resource</span>
                  </button>
                </div>

                {resources.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {resources.map((res) => (
                      <div
                        key={res.tempId}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                            {res.type}
                          </span>
                          <span className="font-medium text-white">{res.name}</span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00c2ff] hover:underline flex items-center gap-1 text-[11px] font-mono"
                          >
                            <span>{res.url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeResource(res.tempId)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: VARIANTS / PLANS */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00c2ff]" />
                    <span>Step 4 — Variants &amp; Service Plans</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure tier options (e.g. Basic, Standard, Premium) or commitment durations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddVariantModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-colors shrink-0 shadow-[0_0_15px_rgba(0,194,255,0.25)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variant</span>
                </button>
              </div>

              {/* Zero Variants State */}
              {variants.length === 0 ? (
                <div className="py-12 px-4 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Layers className="w-8 h-8 text-gray-600 stroke-1" />
                  <span className="text-xs font-semibold text-gray-300">No Variants Defined</span>
                  <p className="text-[11px] text-gray-500 max-w-md">
                    Zero variants configured. This product will operate as a single-tier offering using the baseline pricing configured in Step 5.
                    Click &quot;Add Variant&quot; above to create tiered offerings (e.g. Basic, Standard, Premium).
                  </p>
                </div>
              ) : (
                /* Variants Table / Cards */
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] font-mono uppercase text-gray-400">
                      <tr>
                        <th className="py-3 px-3">Order</th>
                        <th className="py-3 px-3">Variant Name</th>
                        <th className="py-3 px-3">Duration</th>
                        <th className="py-3 px-3">Selling Price</th>
                        <th className="py-3 px-3">Original / List</th>
                        <th className="py-3 px-3">Discount</th>
                        <th className="py-3 px-3">Provider Cost</th>
                        <th className="py-3 px-3">Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {variants.map((variant, idx) => {
                        const discount = calculateDiscount(variant.originalPrice, variant.sellingPrice);
                        return (
                          <tr key={variant.tempId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3 font-mono text-gray-500">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveVariant(idx, "up")}
                                  className="text-gray-500 hover:text-white disabled:opacity-20"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === variants.length - 1}
                                  onClick={() => moveVariant(idx, "down")}
                                  className="text-gray-500 hover:text-white disabled:opacity-20"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-white">
                              {variant.name}
                            </td>
                            <td className="py-3 px-3 text-gray-300 font-mono text-[11px]">
                              {variant.duration}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                              ₹{Number(variant.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-400">
                              {variant.originalPrice ? (
                                <span className="line-through">
                                  ₹{Number(variant.originalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {discount ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                  {discount}% OFF
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500">None</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-amber-400 text-[11px]">
                              {variant.costPrice ? (
                                `₹${Number(variant.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-gray-600">N/A</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-300">
                              {variant.stock}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  variant.isActive
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                }`}
                              >
                                {variant.isActive ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditVariantModal(idx)}
                                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                  title="Edit Variant"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeVariant(idx)}
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
                          {editingVariantIndex !== null ? "Edit Variant" : "Add Plan / Variant"}
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
                            Available Stock
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

                      {/* Live Variant Discount Preview */}
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
                          id="variantIsActive"
                          checked={variantFormData.isActive}
                          onChange={(e) =>
                            setVariantFormData({
                              ...variantFormData,
                              isActive: e.target.checked,
                            })
                          }
                          className="rounded border-white/20 bg-black text-[#00c2ff] focus:ring-0"
                        />
                        <label htmlFor="variantIsActive" className="text-xs text-gray-300">
                          Variant Active (Visible for purchase)
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsVariantModalOpen(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveVariant}
                        className="px-4 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black text-xs font-bold transition-colors"
                      >
                        Save Variant
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: PRICING */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00c2ff]" />
                  <span>Step 5 — Authoritative Pricing &amp; Economics</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Product-level baseline pricing and live discount verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Pricing Fields */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Selling Price (₹) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="e.g., 7000.00"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none"
                    />
                    {stepErrors.sellingPrice && (
                      <span className="text-[11px] text-red-400 mt-1 block">
                        {stepErrors.sellingPrice}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Customer checkout charge for the baseline tier
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Original / List Price (₹)
                    </label>
                    <input
                      type="text"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="e.g., 15000.00"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none"
                    />
                    {stepErrors.originalPrice && (
                      <span className="text-[11px] text-red-400 mt-1 block">
                        {stepErrors.originalPrice}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Displayed with strike-through to highlight customer discount
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Provider Cost (Admin Internal)
                    </label>
                    <input
                      type="text"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="e.g., 4500.00"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none"
                    />
                    {stepErrors.costPrice && (
                      <span className="text-[11px] text-red-400 mt-1 block">
                        {stepErrors.costPrice}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Upstream infrastructure cost. Never exposed to customer frontend or public catalog
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={currency}
                      disabled
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-400 font-mono"
                    />
                  </div>
                </div>

                {/* Live Discount & Margin Preview Card */}
                <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-5 space-y-4">
                  <span className="text-[11px] font-mono text-gray-400 uppercase block tracking-wider">
                    Authoritative Economics Preview
                  </span>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">List Price:</span>
                      <span className="font-mono text-gray-300">
                        {originalPrice ? `₹${Number(originalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Selling Price:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ₹{Number(sellingPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Upstream Cost:</span>
                      <span className="font-mono text-amber-400">
                        {costPrice ? `₹${Number(costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "N/A"}
                      </span>
                    </div>

                    {/* Calculated Live Discount */}
                    <div className="pt-2">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono text-gray-400 uppercase block">
                          Discount Verification
                        </span>
                        {productDiscount ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-400 font-mono">
                              {productDiscount}% OFF
                            </span>
                            <span className="text-[11px] text-emerald-400/80">
                              (Save ₹{(Number(originalPrice) - Number(sellingPrice)).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {Number(sellingPrice) >= Number(originalPrice) && Number(originalPrice) > 0
                              ? "No discount (Selling price ≥ List price)"
                              : "No list price set. Product will display at flat selling price without discount."}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Margin Preview */}
                    {sellingPrice && costPrice && Number(sellingPrice) > 0 && Number(costPrice) > 0 && (
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                        <span className="text-[10px] font-mono text-[#00c2ff] uppercase block">
                          Gross Margin (Admin Internal)
                        </span>
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-white font-bold">
                            ₹{(Number(sellingPrice) - Number(costPrice)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[#00c2ff]">
                            {(((Number(sellingPrice) - Number(costPrice)) / Number(sellingPrice)) * 100).toFixed(2)}% margin
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & SAVE */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Step 6 — Final Review &amp; Persistence</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Inspect the consolidated offering before committing to PostgreSQL.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Review Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Identity & Categorization */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <span className="text-[10px] font-mono text-[#00c2ff] uppercase tracking-wider block">
                      1. Basic Information
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-gray-400 text-[11px]">Product Name:</span>
                        <p className="font-semibold text-white">{name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Slug:</span>
                        <p className="font-mono text-[#00c2ff] text-[11px]">{slug || "—"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-gray-400 text-[11px]">Category:</span>
                          <p className="text-white font-medium">
                            {selectedCategory ? `${selectedCategory.icon || ""} ${selectedCategory.name}` : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[11px]">Status:</span>
                          <p className="text-emerald-400 font-mono font-medium">{status}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Provider:</span>
                        <p className="text-gray-300">
                          {selectedProvider ? `${selectedProvider.name} (${selectedProvider.code})` : "Direct / None"}
                        </p>
                      </div>
                      {shortDescription && (
                        <div>
                          <span className="text-gray-400 text-[11px]">Short Description:</span>
                          <p className="text-gray-300 italic">{shortDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Pricing & Economics */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                      2. Baseline Economics
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Selling Price:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          ₹{Number(sellingPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">List Price:</span>
                        <span className="font-mono text-gray-300">
                          {originalPrice ? `₹${Number(originalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Discount Preview:</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {productDiscount ? `${productDiscount}% OFF` : "No Discount"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Provider Cost (Admin):</span>
                        <span className="font-mono text-amber-400">
                          {costPrice ? `₹${Number(costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Media */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">
                      3. Media Status
                    </span>
                    <div className="flex items-center gap-3">
                      {localFilePreview || imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={localFilePreview || imageUrl}
                          alt="Thumbnail"
                          className="w-14 h-14 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <p className="text-white font-medium">
                          {imageUrl ? "Persistent Image URL Configured" : localFilePreview ? "Local Preview Selected" : "No Image Configured"}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono truncate max-w-xs">
                          {imageUrl || (localFilePreview ? selectedFileName : "Product renders with category badge")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Details & Specs Summary */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                      4. Specifications &amp; Features
                    </span>
                    <div className="space-y-1">
                      <p className="text-gray-300">
                        <strong>Features:</strong> {features.length} bullet point(s) configured
                      </p>
                      <p className="text-gray-300">
                        <strong>Specs:</strong> {specsList.filter((s) => s.key.trim()).length} technical attribute(s) configured
                      </p>
                      <p className="text-gray-300">
                        <strong>Resources:</strong> {resources.length} documentation link(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Variants Summary Table */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                      5. Configured Variants ({variants.length})
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Real variants persisted via Admin Variant API
                    </span>
                  </div>

                  {variants.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      Zero variants configured. Product operates as a single-tier baseline offering.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] font-mono text-gray-500 border-b border-white/5 uppercase">
                          <tr>
                            <th className="py-2">Variant</th>
                            <th className="py-2">Duration</th>
                            <th className="py-2">Selling</th>
                            <th className="py-2">List Price</th>
                            <th className="py-2">Discount</th>
                            <th className="py-2">Cost (Admin)</th>
                            <th className="py-2">Stock</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {variants.map((v) => {
                            const disc = calculateDiscount(v.originalPrice, v.sellingPrice);
                            return (
                              <tr key={v.tempId}>
                                <td className="py-2 font-semibold text-white">{v.name}</td>
                                <td className="py-2 font-mono text-gray-400">{v.duration}</td>
                                <td className="py-2 font-mono text-emerald-400 font-bold">
                                  ₹{Number(v.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 font-mono text-gray-400">
                                  {v.originalPrice ? `₹${Number(v.originalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                </td>
                                <td className="py-2 font-mono text-emerald-400">
                                  {disc ? `${disc}%` : "—"}
                                </td>
                                <td className="py-2 font-mono text-amber-400">
                                  {v.costPrice ? `₹${Number(v.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                </td>
                                <td className="py-2 font-mono text-gray-300">{v.stock}</td>
                                <td className="py-2">
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${v.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                                    {v.isActive ? "ACTIVE" : "INACTIVE"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Footer (Back / Next / Save) */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Step {currentStep - 1}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/products"
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </Link>

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)]"
                >
                  <span>Next: {STEPS[currentStep].label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00c2ff] to-emerald-400 hover:opacity-90 text-black font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(0,194,255,0.3)] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Product to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Create &amp; Save Product</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
