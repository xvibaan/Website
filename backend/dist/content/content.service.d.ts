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
export declare const PUBLIC_CONTENT_KEYS: {
    readonly marketplaceTitle: "content.marketplace_title";
    readonly marketplaceSubtitle: "content.marketplace_subtitle";
    readonly heroBadgeText: "content.hero_badge_text";
    readonly heroHeadline: "content.hero_headline";
    readonly heroDescription: "content.hero_description";
    readonly categoriesHeadline: "content.categories_headline";
    readonly modulesHeadline: "content.modules_headline";
    readonly modulesSubtext: "content.modules_subtext";
    readonly announcement: "content.announcement";
    readonly helpSupport: "content.help_support";
    readonly userGuide: "content.user_guide";
    readonly globalLinks: "content.global_links";
};
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
        faqItems?: Array<{
            question: string;
            answer: string;
        }>;
    };
    userGuide: {
        title: string;
        subtitle: string;
        steps?: Array<{
            stepNumber: string;
            title: string;
            description: string;
        }>;
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
export declare const DEFAULT_PUBLIC_CONTENT: PublicContentSettings;
type SectionWarning = (key: string, reason: string) => void;
/**
 * Builds the public content response from allowlisted raw values.
 * Pure function — no DB access — so it can be exercised in isolation.
 */
export declare function buildPublicContent(raw: Map<string, string>, onWarning?: SectionWarning): PublicContentSettings;
export declare class ContentService {
    /**
     * Reads ONLY allowlisted public content keys from platform_settings.
     * Database errors propagate to the caller (no silent success).
     */
    getPublicContent(onWarning?: SectionWarning): Promise<PublicContentSettings>;
}
export declare const contentService: ContentService;
export {};
