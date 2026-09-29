import React from "react";
import {
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  Server,
  Sparkles,
  Gamepad2,
  Terminal,
  Zap,
  Globe,
  Gift,
  Bot,
} from "lucide-react";

export interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface MarketplaceCategory {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  colorScheme: "cyan" | "violet" | "emerald" | "amber" | "rose" | "blue";
  faceVisual: {
    avatarUrl?: string;
    gradient: string;
    accentColor: string;
    badge: string;
    roleLabel: string;
  };
  productCount: number;
  minPrice: number;
  isAvailable: boolean;
}

// Built-in theme archetypes for the 6 official marketplace categories
export const CATEGORY_THEMES: Record<string, {
  name: string;
  tagline: string;
  description: string;
  colorScheme: MarketplaceCategory["colorScheme"];
  accentColor: string;
  gradient: string;
  badge: string;
  roleLabel: string;
  iconName: string;
}> = {
  gaming: {
    name: "Gaming",
    tagline: "Gaming Tools, Game Servers & Utilities",
    description: "High-performance game hosting, low-latency nodes, and gaming utilities.",
    colorScheme: "rose",
    accentColor: "#F43F5E",
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    badge: "GAMING",
    roleLabel: "Game Systems Specialist",
    iconName: "Gamepad2",
  },
  development: {
    name: "Development",
    tagline: "High-Performance Systems & Microservices",
    description: "Modern backend frameworks, custom APIs, web architectures, and full-stack solutions.",
    colorScheme: "cyan",
    accentColor: "#00C2FF",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    badge: "DEVELOPMENT",
    roleLabel: "Full-Stack Web & System Architect",
    iconName: "Code2",
  },
  "redeem-codes": {
    name: "Redeem Codes",
    tagline: "Digital Gift Cards & Game Codes",
    description: "Official digital game codes, gift cards, subscription vouchers, and digital credits.",
    colorScheme: "violet",
    accentColor: "#A855F7",
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    badge: "REDEEM CODES",
    roleLabel: "Digital Code Specialist",
    iconName: "Gift",
  },
  "ai-tools": {
    name: "AI Tools",
    tagline: "Autonomous Agents & Neural Pipelines",
    description: "Next-gen LLM integration, inference pipelines, and automated intelligence engines.",
    colorScheme: "emerald",
    accentColor: "#10B981",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    badge: "AI TOOLS",
    roleLabel: "AI Automation Agent",
    iconName: "Bot",
  },
  "cloud-hosting": {
    name: "Cloud Hosting",
    tagline: "Zero-Latency Managed Infrastructure",
    description: "High-availability edge networks, protected VPS nodes, and automated cloud deployments.",
    colorScheme: "blue",
    accentColor: "#3B82F6",
    gradient: "from-blue-500/20 via-sky-500/10 to-transparent",
    badge: "HOSTING",
    roleLabel: "Cloud Operations Core",
    iconName: "Server",
  },
  "software-tools": {
    name: "Software Tools",
    tagline: "Developer Productivity & Systems",
    description: "Essential compilation utilities, CLI tooling, and workflow automation suites.",
    colorScheme: "amber",
    accentColor: "#F59E0B",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    badge: "SOFTWARE",
    roleLabel: "Core Systems Engineer",
    iconName: "Cpu",
  },
};

export const CORE_CATEGORY_IDS = [
  "gaming",
  "development",
  "redeem-codes",
  "ai-tools",
  "cloud-hosting",
  "software-tools",
];

/**
 * Checks if a product belongs to a target category slug based purely on database category relation.
 * Does NOT use product name, gameName, cheatStatus, or heuristic string matching.
 */
export function productMatchesCategory(product: any, targetCategorySlug: string): boolean {
  if (!targetCategorySlug || targetCategorySlug === "ALL" || targetCategorySlug === "all") return true;
  const target = targetCategorySlug.toLowerCase().trim();
  const prodSlug = (
    product.categorySlug ||
    product.category_slug ||
    (typeof product.category === "object" && product.category !== null
      ? product.category.slug || product.category.name?.toLowerCase().replace(/\s+/g, "-")
      : null) ||
    (typeof product.category === "string" ? product.category.toLowerCase().replace(/\s+/g, "-") : "")
  ).toLowerCase().trim();

  return prodSlug === target;
}

/**
 * Transforms database categories (from GET /api/v1/categories) into 3D MarketplaceCategory objects.
 * Merges official database data with visual themes without relying on fake heuristics.
 */
export function formatCategoriesFromBackend(
  backendCategories: any[],
  products?: any[]
): MarketplaceCategory[] {
  if (!Array.isArray(backendCategories)) return [];

  return backendCategories
    .filter((bc) => bc && (bc.slug || bc.id))
    .map((bc) => {
      const slug = (bc.slug || bc.id || "").toLowerCase().trim();
      const theme = CATEGORY_THEMES[slug] || {
        name: bc.name,
        tagline: bc.description || `${bc.name} Marketplace Category`,
        description: bc.description || "Authoritative digital products and verified services.",
        colorScheme: "cyan" as const,
        accentColor: "#00C2FF",
        gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
        badge: (bc.name || "CATEGORY").toUpperCase(),
        roleLabel: "Verified Service",
        iconName: bc.icon || "Sparkles",
      };

      const matchingProducts = Array.isArray(products)
        ? products.filter((p) => {
            if (p.is_active === false || p.isArchived) return false;
            return productMatchesCategory(p, slug);
          })
        : [];

      const prices = matchingProducts
        .map((p) => Number(p.sellingPrice ?? p.price ?? p.basePrice))
        .filter((n) => !isNaN(n) && n > 0);

      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

      return {
        id: slug,
        slug,
        name: bc.name || theme.name,
        tagline: bc.description || theme.tagline,
        description: bc.description || theme.description,
        iconName: bc.icon || theme.iconName || "Sparkles",
        colorScheme: theme.colorScheme,
        faceVisual: {
          gradient: theme.gradient,
          accentColor: theme.accentColor,
          badge: theme.badge,
          roleLabel: theme.roleLabel,
        },
        productCount: matchingProducts.length,
        minPrice,
        isAvailable: matchingProducts.length > 0,
      };
    });
}

/**
 * Backward compatibility alias for home page
 */
export const extractCategoriesFromProducts = (
  products: any[],
  storedCategories?: any[]
): MarketplaceCategory[] => {
  if (Array.isArray(storedCategories) && storedCategories.length > 0) {
    return formatCategoriesFromBackend(storedCategories, products);
  }
  return [];
};
