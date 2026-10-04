import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace Catalog",
  description: "Browse the Host Market Place catalog and discover available digital products, tools, modifications, and enhancements.",
  alternates: {
    canonical: "https://hostmarketplace.store/products",
  },
  openGraph: {
    title: "Marketplace Catalog | Host Market Place",
    description: "Browse the Host Market Place catalog and discover available digital products, tools, modifications, and enhancements.",
    url: "https://hostmarketplace.store/products",
  },
  twitter: {
    title: "Marketplace Catalog | Host Market Place",
    description: "Browse the Host Market Place catalog and discover available digital products, tools, modifications, and enhancements.",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
