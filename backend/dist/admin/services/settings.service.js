"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsAdminService = exports.SettingsAdminService = void 0;
const client_1 = require("../../db/client");
const settings_1 = require("../../db/schema/settings");
const audit_service_1 = require("./audit.service");
class SettingsAdminService {
    async getAllSettings(tx) {
        const db = tx || (0, client_1.getDb)();
        const rows = await db.select().from(settings_1.platformSettings);
        const result = {
            marketplace_name: { value: 'Host Market Place', description: 'Platform display name', updatedAt: new Date() },
            business_timezone: { value: 'Asia/Kolkata', description: 'Authoritative accounting timezone', updatedAt: new Date() },
            default_currency: { value: 'INR', description: 'Default system currency', updatedAt: new Date() },
            maintenance_mode: { value: 'false', description: 'System-wide maintenance toggle', updatedAt: new Date() },
            support_email: { value: 'support@hostmarket.local', description: 'Platform support email', updatedAt: new Date() },
            telegram_support_url: { value: 'https://t.me/HostMarketSupport', description: 'Central Telegram support link', updatedAt: new Date() },
            min_deposit_inr: { value: '10', description: 'Minimum wallet deposit amount in INR', updatedAt: new Date() },
            min_deposit_usdt: { value: '1', description: 'Minimum wallet deposit amount in USDT', updatedAt: new Date() },
        };
        for (const row of rows) {
            result[row.key] = {
                value: row.value,
                description: row.description,
                updatedAt: row.updatedAt,
            };
        }
        return result;
    }
    /**
     * Retrieves a single setting value by key, with an optional fallback default.
     */
    async getSettingValue(key, defaultValue = '') {
        const all = await this.getAllSettings();
        return all[key]?.value ?? defaultValue;
    }
    async updateSettings(newSettings, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            for (const [key, value] of Object.entries(newSettings)) {
                await tx
                    .insert(settings_1.platformSettings)
                    .values({
                    key,
                    value: String(value),
                    updatedBy: adminUserId,
                    updatedAt: new Date(),
                })
                    .onConflictDoUpdate({
                    target: settings_1.platformSettings.key,
                    set: {
                        value: String(value),
                        updatedBy: adminUserId,
                        updatedAt: new Date(),
                    },
                });
            }
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'SETTINGS_UPDATE',
                entityType: 'SETTINGS',
                details: { updatedKeys: Object.keys(newSettings) },
            }, tx);
            return this.getAllSettings(tx);
        });
    }
}
exports.SettingsAdminService = SettingsAdminService;
exports.settingsAdminService = new SettingsAdminService();
