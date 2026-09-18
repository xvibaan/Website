import { Product } from "@/components/ProductCard";

export let mockProducts: Product[] = [
  {
    id: "1",
    title: "Apex Legends Spoofer",
    basePrice: 1500,
    margin: 500,
    features: ["EAC/BE Bypass", "HWID Spoofer", "Clean Traces", "24/7 Support"],
    setupLink: "https://t.me/example_setup",
    feedbackLink: "https://t.me/example_feedback",
    isArchived: false,
  },
  {
    id: "2",
    title: "Valorant Aimbot + ESP",
    basePrice: 2500,
    margin: 1000,
    features: ["Vanguard Bypass", "Internal Aimbot", "Stream Proof", "Skeleton ESP"],
    setupLink: "https://t.me/example_setup",
    feedbackLink: "https://t.me/example_feedback",
    isArchived: false,
  },
  {
    id: "3",
    title: "CS2 Multi-Hack",
    basePrice: 800,
    margin: 200,
    features: ["VAC Bypass", "Radar Hack", "Triggerbot", "Skin Changer"],
    setupLink: "https://t.me/example_setup",
    feedbackLink: "https://t.me/example_feedback",
    isArchived: false,
  }
];
