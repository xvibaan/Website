"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentService = exports.ContentService = exports.DEFAULT_PUBLIC_CONTENT = exports.PUBLIC_CONTENT_KEYS = void 0;
exports.buildPublicContent = buildPublicContent;
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const client_1 = require("../db/client");
const settings_1 = require("../db/schema/settings");
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
exports.PUBLIC_CONTENT_KEYS = {
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
};
const ALLOWED_KEY_LIST = Object.values(exports.PUBLIC_CONTENT_KEYS);
// ---------------------------------------------------------------------------
// Structured section schemas (unknown properties are stripped by zod)
// ---------------------------------------------------------------------------
const announcementSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    message: zod_1.z.string().optional(),
    type: zod_1.z.enum(['info', 'warning', 'success', 'critical']).optional(),
});
const helpSupportSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    telegramSupportUrl: zod_1.z.string().optional(),
    discordSupportUrl: zod_1.z.string().optional(),
    contactEmail: zod_1.z.string().optional(),
    faqItems: zod_1.z
        .array(zod_1.z.object({ question: zod_1.z.string(), answer: zod_1.z.string() }))
        .optional(),
});
const userGuideSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    subtitle: zod_1.z.string().optional(),
    steps: zod_1.z
        .array(zod_1.z.object({
        stepNumber: zod_1.z.string(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
    }))
        .optional(),
});
const globalLinksSchema = zod_1.z.object({
    howToBuyUrl: zod_1.z.string().optional(),
    howToDepositUrl: zod_1.z.string().optional(),
    maintenanceMode: zod_1.z.boolean().optional(),
});
/**
 * Defaults are kept identical to the customer frontend fallback
 * (frontend/context/NavigationContext.tsx → defaultContentSettings).
 */
exports.DEFAULT_PUBLIC_CONTENT = {
    marketplaceTitle: 'Host Market Place',
    marketplaceSubtitle: 'Digital marketplace for software, games, redeem codes, AI tools, and cloud hosting with central wallet and order management.',
    heroBadgeText: 'HOST MARKET PLACE',
    heroHeadline: 'Choose What You Need',
    heroDescription: '',
    categoriesHeadline: 'Explore Available Categories',
    modulesHeadline: 'Redeem Codes',
    modulesSubtext: 'Choose an available redeem code product or digital voucher.',
    announcement: {
        enabled: false,
        message: 'Welcome to Host Market Place. Deposit funds to your central wallet to purchase digital products instantly.',
        type: 'info',
    },
    helpSupport: {
        title: 'Support Desk & Marketplace FAQ',
        description: 'Find answers to common questions about wallet deposits, order fulfillment, and digital product delivery.',
        telegramSupportUrl: 'https://t.me/host_marketplace_support',
        discordSupportUrl: 'https://discord.gg/hostmarketplace',
        contactEmail: 'support@hostmarketplace.com',
        faqItems: [
            {
                question: 'How do I add funds to my wallet?',
                answer: 'Navigate to the Deposit / Wallet section, choose your preferred payment method from the available options, and complete the recharge. Your wallet balance updates automatically once the payment is verified.',
            },
            {
                question: 'How do I buy a product?',
                answer: "Browse any product category, select the product you wish to purchase, verify that you have sufficient wallet balance, and click 'Buy Now'. Your order will be placed instantly.",
            },
            {
                question: 'Can I buy from different providers using the same wallet?',
                answer: 'Yes. Your marketplace wallet is centralized. You can use your wallet balance to purchase products from any available provider across all categories.',
            },
            {
                question: 'What happens if my wallet balance is insufficient?',
                answer: 'If your balance is lower than the product price, simply navigate to the Deposit section to add funds before placing your order.',
            },
            {
                question: 'Where can I see my orders?',
                answer: 'All past and active orders are recorded in your Order History tab in the dashboard, complete with status, timestamps, and order details.',
            },
            {
                question: 'Where can I see purchased products or delivered Redeem Codes?',
                answer: "View your delivered products, license keys, and redeemed code details in the 'My Licenses / Purchased Products' section of your dashboard.",
            },
            {
                question: 'How do Redeem Codes work in this marketplace?',
                answer: 'Redeem Codes are products sold on the platform. You do not enter or activate codes into the marketplace UI. Instead, when you purchase a Redeem Code product, the actual code is delivered to you upon successful provider fulfillment.',
            },
            {
                question: 'What happens if an order is still processing?',
                answer: 'Orders are processed through our fulfillment providers. Most orders complete in seconds, but if an order is marked as Pending or Processing, check your Order History for live status updates.',
            },
            {
                question: 'What happens if a product or provider becomes temporarily unavailable?',
                answer: 'If a provider or product is undergoing maintenance, orders for that item may be temporarily paused. Available inventory and live status are displayed on each product card.',
            },
            {
                question: 'How are refunds shown?',
                answer: 'If an order fails or is cancelled according to policy, any refunded balance is credited directly back to your central marketplace wallet and logged in your Wallet Ledger.',
            },
            {
                question: 'How can I contact support?',
                answer: 'You can open a support ticket directly through the Support Desk in your dashboard for help with any order, wallet transaction, or product inquiry.',
            },
        ],
    },
    userGuide: {
        title: 'Host Market Place — Quick Start & User Guide',
        subtitle: 'Complete step-by-step walkthrough to browse, fund your wallet, purchase digital products, and manage your orders.',
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
/**
 * Safely parses a JSON-encoded structured section, validates it, and
 * shallow-merges validated fields over the section default.
 * Any parse/validation failure returns the default for that section only.
 */
function parseSection(key, raw, schema, fallback, onWarning) {
    if (raw === undefined)
        return fallback;
    let json;
    try {
        json = JSON.parse(raw);
    }
    catch {
        onWarning?.(key, 'malformed JSON');
        return fallback;
    }
    const result = schema.safeParse(json);
    if (!result.success) {
        onWarning?.(key, 'schema validation failed');
        return fallback;
    }
    const merged = { ...fallback };
    for (const [field, value] of Object.entries(result.data)) {
        if (value !== undefined)
            merged[field] = value;
    }
    return merged;
}
/**
 * Builds the public content response from allowlisted raw values.
 * Pure function — no DB access — so it can be exercised in isolation.
 */
function buildPublicContent(raw, onWarning) {
    const d = exports.DEFAULT_PUBLIC_CONTENT;
    const k = exports.PUBLIC_CONTENT_KEYS;
    const str = (key, fallback) => raw.get(key) ?? fallback;
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
class ContentService {
    /**
     * Reads ONLY allowlisted public content keys from platform_settings.
     * Database errors propagate to the caller (no silent success).
     */
    async getPublicContent(onWarning) {
        const db = (0, client_1.getDb)();
        const rows = await db
            .select({ key: settings_1.platformSettings.key, value: settings_1.platformSettings.value })
            .from(settings_1.platformSettings)
            .where((0, drizzle_orm_1.inArray)(settings_1.platformSettings.key, ALLOWED_KEY_LIST));
        const raw = new Map();
        for (const row of rows) {
            raw.set(row.key, row.value);
        }
        return buildPublicContent(raw, onWarning);
    }
}
exports.ContentService = ContentService;
exports.contentService = new ContentService();
