import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://hostmarketplace.store";

  return [
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
    // Note: Product dynamic routes (/products/[id]) are omitted in this phase 
    // because fetching them during build time from the external backend API 
    // carries a risk of failing the build if the API is unavailable or environment variables are unset.
  ];
}
