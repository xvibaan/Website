"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface DatabaseContentSettings {
  marketplaceTitle?: string;
  marketplaceSubtitle?: string;
  heroBadgeText?: string;
  heroHeadline?: string;
  heroDescription?: string;
  categoriesHeadline?: string;
  modulesHeadline?: string;
  modulesSubtext?: string;
  announcement?: {
    enabled: boolean;
    message: string;
    type: "info" | "warning" | "success" | "critical";
  };
  helpSupport?: {
    title: string;
    description: string;
    telegramSupportUrl?: string;
    discordSupportUrl?: string;
    contactEmail?: string;
    faqItems?: Array<{ question: string; answer: string }>;
  };
  userGuide?: {
    title: string;
    subtitle: string;
    steps?: Array<{ stepNumber: string; title: string; description: string }>;
  };
  globalLinks?: {
    howToBuyUrl?: string;
    howToDepositUrl?: string;
    maintenanceMode?: boolean;
  };
}

interface NavigationContextType {
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  isUserGuideOpen: boolean;
  openUserGuide: () => void;
  closeUserGuide: () => void;

  contentSettings: DatabaseContentSettings | null;
  isLoadingContent: boolean;
  refreshContent: () => Promise<void>;
}

const defaultContentSettings: DatabaseContentSettings = {
  marketplaceTitle: "Host Market Place",
  marketplaceSubtitle: "Digital marketplace for software, games, redeem codes, AI tools, and cloud hosting with central wallet and order management.",
  heroBadgeText: "HOST MARKET PLACE",
  heroHeadline: "Choose What You Need",
  heroDescription: "",
  categoriesHeadline: "Explore Available Categories",
  modulesHeadline: "Redeem Codes",
  modulesSubtext: "Choose an available redeem code product or digital voucher.",
  announcement: {
    enabled: false,
    message: "Welcome to Host Market Place. Deposit funds to your central wallet to purchase digital products instantly.",
    type: "info",
  },
  helpSupport: {
    title: "Support Desk & Marketplace FAQ",
    description: "Find answers to common questions about wallet deposits, order fulfillment, and digital product delivery.",
    telegramSupportUrl: "https://t.me/host_marketplace_support",
    discordSupportUrl: "https://discord.gg/hostmarketplace",
    contactEmail: "support@hostmarketplace.com",
    faqItems: [
      {
        question: "How do I add funds to my wallet?",
        answer: "Navigate to the Deposit / Wallet section, choose your preferred payment method from the available options, and complete the recharge. Your wallet balance updates automatically once the payment is verified."
      },
      {
        question: "How do I buy a product?",
        answer: "Browse any product category, select the product you wish to purchase, verify that you have sufficient wallet balance, and click 'Buy Now'. Your order will be placed instantly."
      },
      {
        question: "Can I buy from different providers using the same wallet?",
        answer: "Yes. Your marketplace wallet is centralized. You can use your wallet balance to purchase products from any available provider across all categories."
      },
      {
        question: "What happens if my wallet balance is insufficient?",
        answer: "If your balance is lower than the product price, simply navigate to the Deposit section to add funds before placing your order."
      },
      {
        question: "Where can I see my orders?",
        answer: "All past and active orders are recorded in your Order History tab in the dashboard, complete with status, timestamps, and order details."
      },
      {
        question: "Where can I see purchased products or delivered Redeem Codes?",
        answer: "View your delivered products, license keys, and redeemed code details in the 'My Licenses / Purchased Products' section of your dashboard."
      },
      {
        question: "How do Redeem Codes work in this marketplace?",
        answer: "Redeem Codes are products sold on the platform. You do not enter or activate codes into the marketplace UI. Instead, when you purchase a Redeem Code product, the actual code is delivered to you upon successful provider fulfillment."
      },
      {
        question: "What happens if an order is still processing?",
        answer: "Orders are processed through our fulfillment providers. Most orders complete in seconds, but if an order is marked as Pending or Processing, check your Order History for live status updates."
      },
      {
        question: "What happens if a product or provider becomes temporarily unavailable?",
        answer: "If a provider or product is undergoing maintenance, orders for that item may be temporarily paused. Available inventory and live status are displayed on each product card."
      },
      {
        question: "How are refunds shown?",
        answer: "If an order fails or is cancelled according to policy, any refunded balance is credited directly back to your central marketplace wallet and logged in your Wallet Ledger."
      },
      {
        question: "How can I contact support?",
        answer: "You can open a support ticket directly through the Support Desk in your dashboard for help with any order, wallet transaction, or product inquiry."
      }
    ],
  },
  userGuide: {
    title: "Host Market Place — Quick Start & User Guide",
    subtitle: "Complete step-by-step walkthrough to browse, fund your wallet, purchase digital products, and manage your orders.",
    steps: [
      { stepNumber: "01", title: "Create Your Account", description: "Sign up or log in to access the marketplace, manage your central wallet, and track your purchased digital products." },
      { stepNumber: "02", title: "Add Funds to Your Wallet", description: "Recharge your central marketplace wallet using the available payment methods supported by the platform. Once verified, your balance updates in real-time." },
      { stepNumber: "03", title: "Browse Products", description: "Explore digital products across Gaming, Development, Redeem Codes, AI Tools, Cloud Hosting, and Software Tools." },
      { stepNumber: "04", title: "Check Product Details", description: "Review comprehensive product descriptions, features, pricing, and availability details before making a purchase." },
      { stepNumber: "05", title: "Buy With Wallet", description: "Click 'Buy Now' to complete your order instantly using your central marketplace wallet balance." },
      { stepNumber: "06", title: "Order Processing", description: "Once placed, your order is automatically transmitted to the appropriate service provider for instant fulfillment." },
      { stepNumber: "07", title: "View Your Purchase", description: "Access your order result, delivery details, and license or product credentials directly in Order History and Purchased Products." },
      { stepNumber: "08", title: "Redeem Codes", description: "Redeem Codes are digital products sold by the marketplace. Purchase available code products to receive your actual code delivered upon successful fulfillment." },
      { stepNumber: "09", title: "Support", description: "If you need assistance with an order or payment, reach out directly through our built-in Support Desk." }
    ],
  },
  globalLinks: {
    howToBuyUrl: "",
    howToDepositUrl: "",
    maintenanceMode: false,
  },
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [contentSettings, setContentSettings] = useState<DatabaseContentSettings | null>(defaultContentSettings);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        setContentSettings(data);
      }
    } catch (err) {
      console.error("Failed to load content settings:", err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isMobileMenuOpen,
        openMobileMenu: () => setIsMobileMenuOpen(true),
        closeMobileMenu: () => setIsMobileMenuOpen(false),
        toggleMobileMenu: () => setIsMobileMenuOpen((prev) => !prev),
        isUserGuideOpen,
        openUserGuide: () => setIsUserGuideOpen(true),
        closeUserGuide: () => setIsUserGuideOpen(false),
        contentSettings: contentSettings || defaultContentSettings,
        isLoadingContent,
        refreshContent: fetchContent,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
