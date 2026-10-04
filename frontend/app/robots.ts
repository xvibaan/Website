import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/forgot-password",
        "/dashboard/",
        "/admin/",
        "/api/",
      ],
    },
    sitemap: "https://hostmarketplace.store/sitemap.xml",
  };
}
