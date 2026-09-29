import { DbTransaction } from '../../db/client';
export declare class SettingsAdminService {
    getAllSettings(tx?: DbTransaction): Promise<Record<string, {
        value: string;
        description: string | null;
        updatedAt: Date;
    }>>;
    /**
     * Retrieves a single setting value by key, with an optional fallback default.
     */
    getSettingValue(key: string, defaultValue?: string): Promise<string>;
    updateSettings(newSettings: Record<string, string>, adminUserId: string): Promise<Record<string, {
        value: string;
        description: string | null;
        updatedAt: Date;
    }>>;
}
export declare const settingsAdminService: SettingsAdminService;
