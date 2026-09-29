import { DbTransaction } from '../../db/client';
import { Provider, NewProvider, ProviderHealthLog, NewProviderHealthLog } from '../../db/schema/providers';
import { SafeProvider, ProviderOperationalHealth } from '../types/provider.types';
export declare class ProviderRepository {
    private getDb;
    /**
     * Converts a database Provider entity into a SafeProvider, ensuring credentials
     * are scrubbed before reaching any API layer or caller.
     */
    toSafeProvider(p: Provider): SafeProvider;
    create(data: NewProvider, tx?: DbTransaction): Promise<Provider>;
    findById(id: string, tx?: DbTransaction): Promise<Provider | null>;
    findByCode(code: string, tx?: DbTransaction): Promise<Provider | null>;
    findAll(filter?: {
        isEnabled?: boolean;
        operationalHealth?: string;
        limit?: number;
        offset?: number;
    }, tx?: DbTransaction): Promise<{
        providers: Provider[];
        total: number;
    }>;
    update(id: string, data: Partial<NewProvider>, tx?: DbTransaction): Promise<Provider | null>;
    updateHealth(id: string, healthData: {
        operationalHealth: ProviderOperationalHealth;
        lastHealthCheckAt: Date;
        lastSuccessfulHealthCheckAt?: Date;
        lastFailedHealthCheckAt?: Date;
        failureCount?: number;
        lastHealthResponseTimeMs?: number;
        lastHealthErrorMessage?: string | null;
    }, tx?: DbTransaction): Promise<Provider | null>;
    recordHealthLog(logData: NewProviderHealthLog, tx?: DbTransaction): Promise<ProviderHealthLog>;
    getHealthLogs(providerId: string, limit?: number, tx?: DbTransaction): Promise<ProviderHealthLog[]>;
}
export declare const providerRepository: ProviderRepository;
