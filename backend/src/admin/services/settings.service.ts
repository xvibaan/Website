import { getDb, withTransaction, DbTransaction } from '../../db/client';
import { platformSettings } from '../../db/schema/settings';
import { auditService } from './audit.service';

export class SettingsAdminService {
  async getAllSettings(tx?: DbTransaction): Promise<Record<string, { value: string; description: string | null; updatedAt: Date }>> {
    const db = tx || getDb();
    const rows = await db.select().from(platformSettings);

    const result: Record<string, { value: string; description: string | null; updatedAt: Date }> = {
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
  async getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
    const all = await this.getAllSettings();
    return all[key]?.value ?? defaultValue;
  }

  async updateSettings(
    newSettings: Record<string, string>,
    adminUserId: string
  ): Promise<Record<string, { value: string; description: string | null; updatedAt: Date }>> {
    return withTransaction(async (tx) => {
      for (const [key, value] of Object.entries(newSettings)) {
        await tx
          .insert(platformSettings)
          .values({
            key,
            value: String(value),
            updatedBy: adminUserId,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: platformSettings.key,
            set: {
              value: String(value),
              updatedBy: adminUserId,
              updatedAt: new Date(),
            },
          });
      }

      await auditService.record(
        {
          adminUserId,
          action: 'SETTINGS_UPDATE',
          entityType: 'SETTINGS',
          details: { updatedKeys: Object.keys(newSettings) },
        },
        tx
      );

      return this.getAllSettings(tx);
    });
  }
}

export const settingsAdminService = new SettingsAdminService();
