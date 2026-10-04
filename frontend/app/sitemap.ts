import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://hostmarketplace.store";

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    // Determine backend URL (fallback to localhost for local dev/builds if not set)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:4000");
    
    if (!backendUrl) {
      return staticEntries;
    }

    const res = await fetch(`${backendUrl}/api/v1/products`, {
      cache: "no-store", // Do not cache build-time failed states
    });

    if (!res.ok) {
      console.warn(`Sitemap generation: API returned ${res.status}`);
      return staticEntries;
    }

    const products = await res.json();

    if (!Array.isArray(products)) {
      return staticEntries;
    }

    const dynamicEntries: MetadataRoute.Sitemap = products.map((product: any) => ({
      url: `${baseUrl}/products/${product.slug || product.id}`,
      lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticEntries, ...dynamicEntries];
  } catch (error) {
    console.error("Failed to fetch products for dynamic sitemap:", error);
    // Silent fail to prevent build failure if backend is unavailable
    return staticEntries;
  }
}
