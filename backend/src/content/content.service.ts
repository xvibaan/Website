import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client';
import { platformSettings } from '../db/schema/settings';

/**
 * Public Content Settings
 *
 * Customer-facing marketing/help content is stored in the existing generic
 * `platform_settings` key/value table under the explicit `content.` namespace.
 *
 * SECURITY: Only the keys listed in PUBLIC_CONTENT_KEYS are ever read or exposed
 * by the public content endpoint. Adding a new row to `platform_settings` does
 * NOT make it public — it must be explicitly added to this allowlist in code.
 *
 * Storage format:
 *   - Simple string keys are stored as plain text.
 *   - Structured keys (announcement, help_support, user_guide, global_links)
 *     are stored as JSON strings. Stored fields are shallow-merged over the
 *     defaults below. Malformed or invalid JSON falls back to the default for
 *     that section only.
 *
 * Admins can update these keys via the existing PATCH /api/v1/admin/settings
 * endpoint, e.g. { "settings": { "content.hero_headline": "..." } }.
 */
export const PUBLIC_CONTENT_KEYS = {
  marketplaceTitle: 'content.marketplace_title',
  marketplaceSubtitle: 'content.marketplace_subtitle',
  heroBadgeText: 'content.hero_badge_text',
  heroHeadline: 'content.hero_headline',
  heroDescription: 'content.hero_description',
  categoriesHeadline: 'content.categories_headline',
  modulesHeadline: 'content.modules_headline',
  modulesSubtext: 'content.modules_subtext',
  announcement: 'content.announcement',
  helpSupport: 'content.help_support',
  userGuide: 'content.user_guide',
  globalLinks: 'content.global_links',
} as const;

const ALLOWED_KEY_LIST: string[] = Object.values(PUBLIC_CONTENT_KEYS);

// ---------------------------------------------------------------------------
// Structured section schemas (unknown properties are stripped by zod)
// ---------------------------------------------------------------------------

const announcementSchema = z.object({
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  type: z.enum(['info', 'warning', 'success', 'critical']).optional(),
});

const helpSupportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  telegramSupportUrl: z.string().optional(),
  discordSupportUrl: z.string().optional(),
  contactEmail: z.string().optional(),
  faqItems: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
});

const userGuideSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  steps: z
    .array(
      z.object({
        stepNumber: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

const globalLinksSchema = z.object({
  howToBuyUrl: z.string().optional(),
  howToDepositUrl: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Public response type (mirrors frontend DatabaseContentSettings)
// ---------------------------------------------------------------------------

export interface PublicContentSettings {
  marketplaceTitle: string;
  marketplaceSubtitle: string;
  heroBadgeText: string;
  heroHeadline: string;
  heroDescription: string;
  categoriesHeadline: string;
  modulesHeadline: string;
  modulesSubtext: string;
  announcement: {
    enabled: boolean;
    message: string;
    type: 'info' | 'warning' | 'success' | 'critical';
  };
  helpSupport: {
    title: string;
    description: string;
    telegramSupportUrl?: string;
    discordSupportUrl?: string;
    contactEmail?: string;
    faqItems?: Array<{ question: string; answer: string }>;
  };
  userGuide: {
    title: string;
    subtitle: string;
    steps?: Array<{ stepNumber: string; title: string; description: string }>;
  };
  globalLinks: {
    howToBuyUrl: string;
    howToDepositUrl: string;
    maintenanceMode: boolean;
  };
}

/**
 * Defaults are kept identical to the customer frontend fallback
 * (frontend/context/NavigationContext.tsx → defaultContentSettings).
 */
export const DEFAULT_PUBLIC_CONTENT: PublicContentSettings = {
  marketplaceTitle: 'Host Market Place',
  marketplaceSubtitle:
    'Digital marketplace for software, games, redeem codes, AI tools, and cloud hosting with central wallet and order management.',
  heroBadgeText: 'HOST MARKET PLACE',
  heroHeadline: 'Choose What You Need',
  heroDescription: '',
  categoriesHeadline: 'Explore Available Categories',
  modulesHeadline: 'Redeem Codes',
  modulesSubtext: 'Choose an available redeem code product or digital voucher.',
  announcement: {
    enabled: false,
    message:
      'Welcome to Host Market Place. Deposit funds to your central wallet to purchase digital products instantly.',
    type: 'info',
  },
  helpSupport: {
    title: 'Support Desk & Marketplace FAQ',
    description:
      'Find answers to common questions about wallet deposits, order fulfillment, and digital product delivery.',
    telegramSupportUrl: 'https://t.me/host_marketplace_support',
    discordSupportUrl: 'https://discord.gg/hostmarketplace',
    contactEmail: 'support@hostmarketplace.com',
    faqItems: [
      {
        question: 'How do I add funds to my wallet?',
        answer:
          'Navigate to the Deposit / Wallet section, choose your preferred payment method from the available options, and complete the recharge. Your wallet balance updates automatically once the payment is verified.',
      },
      {
        question: 'How do I buy a product?',
        answer:
          "Browse any product category, select the product you wish to purchase, verify that you have sufficient wallet balance, and click 'Buy Now'. Your order will be placed instantly.",
      },
      {
        question: 'Can I buy from different providers using the same wallet?',
        answer:
          'Yes. Your marketplace wallet is centralized. You can use your wallet balance to purchase products from any available provider across all categories.',
      },
      {
        question: 'What happens if my wallet balance is insufficient?',
        answer:
          'If your balance is lower than the product price, simply navigate to the Deposit section to add funds before placing your order.',
      },
      {
        question: 'Where can I see my orders?',
        answer:
          'All past and active orders are recorded in your Order History tab in the dashboard, complete with status, timestamps, and order details.',
      },
      {
        question: 'Where can I see purchased products or delivered Redeem Codes?',
        answer:
          "View your delivered products, license keys, and redeemed code details in the 'My Licenses / Purchased Products' section of your dashboard.",
      },
      {
        question: 'How do Redeem Codes work in this marketplace?',
        answer:
          'Redeem Codes are products sold on the platform. You do not enter or activate codes into the marketplace UI. Instead, when you purchase a Redeem Code product, the actual code is delivered to you upon successful provider fulfillment.',
      },
      {
        question: 'What happens if an order is still processing?',
        answer:
          'Orders are processed through our fulfillment providers. Most orders complete in seconds, but if an order is marked as Pending or Processing, check your Order History for live status updates.',
      },
      {
        question: 'What happens if a product or provider becomes temporarily unavailable?',
        answer:
          'If a provider or product is undergoing maintenance, orders for that item may be temporarily paused. Available inventory and live status are displayed on each product card.',
      },
      {
        question: 'How are refunds shown?',
        answer:
          'If an order fails or is cancelled according to policy, any refunded balance is credited directly back to your central marketplace wallet and logged in your Wallet Ledger.',
      },
      {
        question: 'How can I contact support?',
        answer:
          'You can open a support ticket directly through the Support Desk in your dashboard for help with any order, wallet transaction, or product inquiry.',
      },
    ],
  },
  userGuide: {
    title: 'Host Market Place — Quick Start & User Guide',
    subtitle:
      'Complete step-by-step walkthrough to browse, fund your wallet, purchase digital products, and manage your orders.',
    steps: [
      { stepNumber: '01', title: 'Create Your Account', description: 'Sign up or log in to access the marketplace, manage your central wallet, and track your purchased digital products.' },
      { stepNumber: '02', title: 'Add Funds to Your Wallet', description: 'Recharge your central marketplace wallet using the available payment methods supported by the platform. Once verified, your balance updates in real-time.' },
      { stepNumber: '03', title: 'Browse Products', description: 'Explore digital products across Gaming, Development, Redeem Codes, AI Tools, Cloud Hosting, and Software Tools.' },
      { stepNumber: '04', title: 'Check Product Details', description: 'Review comprehensive product descriptions, features, pricing, and availability details before making a purchase.' },
      { stepNumber: '05', title: 'Buy With Wallet', description: "Click 'Buy Now' to complete your order instantly using your central marketplace wallet balance." },
      { stepNumber: '06', title: 'Order Processing', description: 'Once placed, your order is automatically transmitted to the appropriate service provider for instant fulfillment.' },
      { stepNumber: '07', title: 'View Your Purchase', description: 'Access your order result, delivery details, and license or product credentials directly in Order History and Purchased Products.' },
      { stepNumber: '08', title: 'Redeem Codes', description: 'Redeem Codes are digital products sold by the marketplace. Purchase available code products to receive your actual code delivered upon successful fulfillment.' },
      { stepNumber: '09', title: 'Support', description: 'If you need assistance with an order or payment, reach out directly through our built-in Support Desk.' },
    ],
  },
  globalLinks: {
    howToBuyUrl: '',
    howToDepositUrl: '',
    maintenanceMode: false,
  },
};

type SectionWarning = (key: string, reason: string) => void;

/**
 * Safely parses a JSON-encoded structured section, validates it, and
 * shallow-merges validated fields over the section default.
 * Any parse/validation failure returns the default for that section only.
 */
function parseSection<T extends object>(
  key: string,
  raw: string | undefined,
  schema: z.ZodType<Partial<T>>,
  fallback: T,
  onWarning?: SectionWarning
): T {
  if (raw === undefined) return fallback;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    onWarning?.(key, 'malformed JSON');
    return fallback;
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    onWarning?.(key, 'schema validation failed');
    return fallback;
  }

  const merged: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
  for (const [field, value] of Object.entries(result.data)) {
    if (value !== undefined) merged[field] = value;
  }
  return merged as T;
}

/**
 * Builds the public content response from allowlisted raw values.
 * Pure function — no DB access — so it can be exercised in isolation.
 */
export function buildPublicContent(
  raw: Map<string, string>,
  onWarning?: SectionWarning
): PublicContentSettings {
  const d = DEFAULT_PUBLIC_CONTENT;
  const k = PUBLIC_CONTENT_KEYS;
  const str = (key: string, fallback: string) => raw.get(key) ?? fallback;

  return {
    marketplaceTitle: str(k.marketplaceTitle, d.marketplaceTitle),
    marketplaceSubtitle: str(k.marketplaceSubtitle, d.marketplaceSubtitle),
    heroBadgeText: str(k.heroBadgeText, d.heroBadgeText),
    heroHeadline: str(k.heroHeadline, d.heroHeadline),
    heroDescription: str(k.heroDescription, d.heroDescription),
    categoriesHeadline: str(k.categoriesHeadline, d.categoriesHeadline),
    modulesHeadline: str(k.modulesHeadline, d.modulesHeadline),
    modulesSubtext: str(k.modulesSubtext, d.modulesSubtext),
    announcement: parseSection(k.announcement, raw.get(k.announcement), announcementSchema, d.announcement, onWarning),
    helpSupport: parseSection(k.helpSupport, raw.get(k.helpSupport), helpSupportSchema, d.helpSupport, onWarning),
    userGuide: parseSection(k.userGuide, raw.get(k.userGuide), userGuideSchema, d.userGuide, onWarning),
    globalLinks: parseSection(k.globalLinks, raw.get(k.globalLinks), globalLinksSchema, d.globalLinks, onWarning),
  };
}

export class ContentService {
  /**
   * Reads ONLY allowlisted public content keys from platform_settings.
   * Database errors propagate to the caller (no silent success).
   */
  async getPublicContent(onWarning?: SectionWarning): Promise<PublicContentSettings> {
    const db = getDb();
    const rows = await db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, ALLOWED_KEY_LIST));

    const raw = new Map<string, string>();
    for (const row of rows) {
      raw.set(row.key, row.value);
    }

    return buildPublicContent(raw, onWarning);
  }
}

export const contentService = new ContentService();
