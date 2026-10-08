import { notFound } from "next/navigation";
import { getProduct } from "@/lib/seo";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProduct(id);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "error") {
    // Render the client component with null product which will show an error state
    return <ProductDetailClient initialProduct={null} />;
  }

  return <ProductDetailClient initialProduct={result.product as any} />;
}
