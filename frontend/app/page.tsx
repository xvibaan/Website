import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Host Market Place | Digital Marketplace for Gaming & Tools",
  description: "Explore the best digital products, game modifications, software tools, and enhancements with instant delivery and secure wallet management.",
  alternates: {
    canonical: "https://hostmarketplace.store/",
  },
  openGraph: {
    title: "Host Market Place | Digital Marketplace for Gaming & Tools",
    description: "Explore the best digital products, game modifications, software tools, and enhancements with instant delivery and secure wallet management.",
    url: "https://hostmarketplace.store/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Host Market Place | Digital Marketplace for Gaming & Tools",
    description: "Explore the best digital products, game modifications, software tools, and enhancements with instant delivery and secure wallet management.",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
