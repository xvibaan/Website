import type { Metadata, ResolvingMetadata } from "next";
import { api } from "@/lib/api";

export const revalidate = 3600;
type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const fallbackMetadata: Metadata = {
    title: "Product Details | Host Market Place",
    description: "View product details on Host Market Place.",
    alternates: {
      canonical: `https://hostmarketplace.store/products/${params.id}`,
    },
    openGraph: {
      title: "Product Details | Host Market Place",
      description: "View product details on Host Market Place.",
      url: `https://hostmarketplace.store/products/${params.id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Product Details | Host Market Place",
      description: "View product details on Host Market Place.",
    },
  };

  try {
    // Attempt to fetch product data from the authoritative source
    const product: any = await api.get(`/api/v1/products/${params.id}`);

    if (!product || !product.id) {
      return fallbackMetadata;
    }

    const title = product.name || product.title || "Product Details";
    const description = product.shortDescription || product.description || "View product details on Host Market Place.";
    const imageUrl = product.imageUrl || product.image_url;

    const previousImages = (await parent).openGraph?.images || [];

    return {
      title: title,
      description: description,
      alternates: {
        canonical: `https://hostmarketplace.store/products/${product.slug || params.id}`,
      },
      openGraph: {
        title: `${title} | Host Market Place`,
        description: description,
        url: `https://hostmarketplace.store/products/${product.slug || params.id}`,
        type: "website",
        images: imageUrl ? [imageUrl, ...previousImages] : previousImages,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Host Market Place`,
        description: description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error("Failed to fetch product for metadata:", error);
    return fallbackMetadata;
  }
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  let product: any = null;

  try {
    product = await api.get(`/api/v1/products/${params.id}`);
  } catch (error) {
    // Silent fail for JSON-LD if product not found
  }

  let jsonLd = null;

  if (product && product.id) {
    const title = product.name || product.title || "Product Details";
    const description = product.shortDescription || product.description || "View product details on Host Market Place.";
    const imageUrl = product.imageUrl || product.image_url;
    const url = `https://hostmarketplace.store/products/${product.slug || params.id}`;
    const price = product.sellingPrice ?? product.price ?? product.basePrice ?? null;
    const currency = product.currency || "INR";

    const isOutOfStock = product.availability === "OUT_OF_STOCK" || product.status === "DISABLED";
    const availability = isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description: description,
      url: url,
      ...(imageUrl && { image: imageUrl }),
    };

    if (price !== null && price !== undefined) {
      jsonLd.offers = {
        "@type": "Offer",
        price: price.toString(),
        priceCurrency: currency,
        availability: availability,
        url: url,
      };
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
