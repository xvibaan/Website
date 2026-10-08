import { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";
import { getCategories, getProducts, buildMetadata, categoryPath, breadcrumbJsonLd, serializeJsonLd, toMetaDescription } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const rawCategorySlug = resolvedSearchParams.category;
  const categorySlug = rawCategorySlug ? rawCategorySlug.trim().toLowerCase() : null;

  if (!categorySlug || categorySlug === "all") {
    return buildMetadata({
      title: "Products & Tools",
      description: "Explore our collection of authentic digital tools, hosting, licenses, and redeem codes with digital fulfillment.",
      path: "/products",
    });
  }

  const categories = await getCategories();
  const activeCategory = categories?.find(c => c.slug === categorySlug);

  if (activeCategory) {
    return buildMetadata({
      title: `${activeCategory.name} Products`,
      description: toMetaDescription(activeCategory.description) || `Browse our collection of authentic ${activeCategory.name} products.`,
      path: categoryPath(categorySlug),
    });
  }

  return buildMetadata({
    title: "Products",
    description: "Browse our collection of authentic digital products.",
    path: "/products",
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawCategorySlug = resolvedSearchParams.category;
  const categorySlug = rawCategorySlug ? rawCategorySlug.trim().toLowerCase() : "all";

  const initialCategories = await getCategories() || [];

  if (categorySlug !== "all" && initialCategories.length > 0) {
    const activeCategory = initialCategories.find(c => c.slug === categorySlug);
    if (!activeCategory) {
      redirect("/products");
    }
  }

  const initialProducts = await getProducts(categorySlug !== "all" ? categorySlug : undefined) || [];

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Marketplace", path: "/products" },
  ];

  if (categorySlug !== "all") {
    const activeCategory = initialCategories.find(c => c.slug === categorySlug);
    if (activeCategory) {
      breadcrumbs.push({ name: activeCategory.name, path: categoryPath(categorySlug) });
    }
  }

  const breadcrumbData = breadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbData) }}
      />
      <ProductsClient
        initialCategory={categorySlug}
        initialCategories={initialCategories as any}
        initialProducts={initialProducts as any}
      />
    </>
  );
}
