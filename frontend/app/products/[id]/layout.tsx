import type { Metadata, ResolvingMetadata } from "next";
import { getProduct, buildMetadata, productJsonLd, serializeJsonLd, breadcrumbJsonLd, absoluteUrl, productPath } from "@/lib/seo";

export const revalidate = 3600;
type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const previousImages = (await parent).openGraph?.images || [];

  const result = await getProduct(id);

  if (result.status !== "ok") {
    return buildMetadata({
      title: "Product Details",
      description: "View product details on Host Market Place.",
      path: `/products/${id}`,
      noindex: true,
      images: previousImages as string[],
    });
  }

  const { product } = result;
  const title = product.name || product.title || "Product Details";
  const description = product.shortDescription || product.description || "View product details on Host Market Place.";
  const images = typeof product.imageUrl === "string" && product.imageUrl.trim() ? [product.imageUrl.trim(), ...previousImages as string[]] : previousImages as string[];

  return buildMetadata({
    title,
    description: description.substring(0, 160),
    path: productPath(product),
    images,
  });
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProduct(id);

  if (result.status !== "ok") {
    return <>{children}</>;
  }

  const { product } = result;
  const jsonLd = productJsonLd(product);

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Marketplace", path: "/products" },
  ];
  if (product.category) {
    breadcrumbs.push({ name: String(product.category), path: `/products?category=${encodeURIComponent(product.categorySlug || '')}` });
  }
  breadcrumbs.push({ name: product.name || product.title || "Product", path: productPath(product) });

  const breadcrumbData = breadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbData) }}
      />
      {children}
    </>
  );
}
