import "server-only";
import { cache } from "react";
import type { Metadata } from "next";

/**
 * Shared server-side SEO + public catalog helpers.
 *
 * Everything here is derived either from the public catalog API
 * (GET /api/v1/categories, /api/v1/products, /api/v1/products/:id)
 * or from static site identity. Do NOT add business facts (company name,
 * address, phone, email, social profiles) here until the owner provides them.
 */

export const SITE_URL = "https://hostmarketplace.store";
export const SITE_NAME = "Host Market Place";
export const SITE_DESCRIPTION =
  "Host Market Place is a digital products marketplace. Browse products by category, pay from an INR wallet balance, and track orders from your dashboard.";

/**
 * Legal/contact pages (terms, privacy, refund-policy, contact) still contain
 * [INSERT_...] placeholders. While this is false they are served with
 * `noindex, follow` and excluded from the sitemap so placeholder text is not
 * indexed. Flip to true only after the owner supplies the real legal details.
 */
export const LEGAL_PAGES_FINALIZED = false;

/** Revalidation window (seconds) for public catalog data used in SSR/ISR. */
export const CATALOG_REVALIDATE_SECONDS = 300;

export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function categoryPath(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`;
}

export function productPath(product: { slug?: string | null; id: string }): string {
  return `/products/${encodeURIComponent(product.slug || product.id)}`;
}

export function isAbsoluteHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/** Collapses whitespace and trims to a meta-description friendly length. */
export function toMetaDescription(text: string | null | undefined, maxLength = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:-]+$/, "")}…`;
}

/**
 * Serializes JSON-LD safely for embedding inside a <script> tag.
 * Escapes "<" so catalog text containing "</script>" cannot break out.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

interface BuildMetadataOptions {
  /** Page title without the site suffix (the root layout template adds it). */
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  images?: string[];
}

/**
 * Builds consistent page metadata: title, description, canonical, Open Graph
 * and Twitter tags all point to the same canonical URL.
 */
export function buildMetadata({ title, description, path, noindex, images }: BuildMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      ...(images && images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(images && images.length > 0 ? { images } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Public catalog types (mirror backend/src/catalog/catalog.routes.ts)
// ---------------------------------------------------------------------------

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export interface PublicVariant {
  id: string;
  name: string;
  duration?: string | null;
  originalPrice?: number | null;
  sellingPrice: number;
  price?: number;
  currency?: string;
  availableStock?: number;
  isActive?: boolean;
  is_active?: boolean;
}

export interface PublicProduct {
  id: string;
  name: string;
  title?: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  categoryId?: string | null;
  categorySlug: string | null;
  originalPrice: number | null;
  sellingPrice: number;
  currency: string;
  imageUrl: string | null;
  status: string;
  is_active?: boolean;
  features?: string[];
  variants: PublicVariant[];
  createdAt?: string;
  [key: string]: unknown;
}

function getBackendUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:4000")
  );
}

type FetchResult<T> = { ok: true; data: T } | { ok: false; status: number };

async function fetchPublicJson<T>(path: string): Promise<FetchResult<T>> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${backendUrl}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Active categories, or null if the catalog API is unreachable. */
export const getCategories = cache(async (): Promise<PublicCategory[] | null> => {
  const result = await fetchPublicJson<PublicCategory[]>("/api/v1/categories");
  if (!result.ok || !Array.isArray(result.data)) return null;
  return result.data.filter((c) => c && typeof c.slug === "string" && c.slug.length > 0);
});

export const getContentSettings = cache(async () => {
  const result = await fetchPublicJson<any>("/api/v1/content");
  if (!result.ok) return null;
  return result.data;
});

/** Active products (optionally for one category slug), or null on API failure. */
export const getProducts = cache(async (categorySlug?: string): Promise<PublicProduct[] | null> => {
  const query = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : "";
  const result = await fetchPublicJson<PublicProduct[]>(`/api/v1/products${query}`);
  if (!result.ok || !Array.isArray(result.data)) return null;
  return result.data.filter((p) => p && p.status === "ACTIVE");
});

export type ProductLookup =
  | { status: "ok"; product: PublicProduct }
  | { status: "not-found" }
  | { status: "error" };

/** Single active product by UUID or slug. Distinguishes 404 from API errors. */
export const getProduct = cache(async (idOrSlug: string): Promise<ProductLookup> => {
  const result = await fetchPublicJson<PublicProduct>(`/api/v1/products/${encodeURIComponent(idOrSlug)}`);
  if (result.ok) {
    return result.data && result.data.id ? { status: "ok", product: result.data } : { status: "not-found" };
  }
  if (result.status === 404) return { status: "not-found" };
  return { status: "error" };
});

/** Number of active products per category slug. */
export function countProductsByCategory(products: PublicProduct[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.categorySlug) continue;
    counts.set(p.categorySlug, (counts.get(p.categorySlug) || 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Structured data builders
// ---------------------------------------------------------------------------

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function formatPrice(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

function activeVariantsOf(product: PublicProduct): PublicVariant[] {
  return (product.variants || []).filter((v) => v.isActive !== false && v.is_active !== false);
}

function variantInStock(v: PublicVariant): boolean {
  // Mirrors the product page: a variant is purchasable unless stock is <= 0.
  return v.availableStock === undefined || v.availableStock === null || v.availableStock > 0;
}

/**
 * Product JSON-LD built strictly from the public catalog response.
 * - Price/currency come from the variant(s) when active variants exist
 *   (the backend charges the variant price), otherwise from the product.
 * - Availability mirrors the purchase gate used on the product page.
 * - Image is only included when it is an absolute http(s) URL.
 */
export function productJsonLd(product: PublicProduct) {
  const url = absoluteUrl(productPath(product));
  const name = product.name || product.title || "Product";
  const description = toMetaDescription(product.shortDescription || product.description, 500);
  const currency = product.currency || "INR";
  const variants = activeVariantsOf(product);

  const baseProduct = {
    "@context": "https://schema.org",
    "@id": `${url}#product`,
    name,
    url,
    ...(description ? { description } : {}),
    ...(isAbsoluteHttpUrl(product.imageUrl) ? { image: [product.imageUrl.trim()] } : {}),
    ...(product.category ? { category: product.category } : {}),
  };

  const priced = variants
    .map((v) => ({ v, price: formatPrice(v.sellingPrice ?? v.price) }))
    .filter((x): x is { v: PublicVariant; price: string } => x.price !== null);

  if (priced.length > 1) {
    return {
      ...baseProduct,
      "@type": "Product",
      offers: priced.map((p) => ({
        "@type": "Offer",
        name: p.v.name || undefined,
        price: p.price,
        priceCurrency: p.v.currency || currency,
        availability: variantInStock(p.v) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: url + "?variant=" + p.v.id,
      }))
    };
  } else if (priced.length === 1) {
    return {
      ...baseProduct,
      "@type": "Product",
      offers: {
        "@type": "Offer",
        price: priced[0].price,
        priceCurrency: priced[0].v.currency || currency,
        availability: variantInStock(priced[0].v) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
      }
    };
  } else {
    const price = formatPrice(product.sellingPrice);
    let offers: any;
    if (price !== null) {
      offers = {
        "@type": "Offer",
        price,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        url,
      };
    }
    return {
      ...baseProduct,
      "@type": "Product",
      ...(offers ? { offers } : {}),
    };
  }
}
