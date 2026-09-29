import { ProviderRepository } from '../repositories/provider.repository';
import { ProviderResolver } from './ProviderResolver';
import { ProviderHealthCheckResult } from '../types/provider.types';
export declare class ProviderHealthService {
    private repo;
    private resolver;
    private timeoutMs;
    constructor(repo?: ProviderRepository, resolver?: ProviderResolver, timeoutMs?: number);
    /**
     * Executes an isolated health check against a single provider.
     * Enforces strict timeout and exception boundaries — NEVER crashes the Fastify server.
     */
    checkHealth(providerIdOrCode: string): Promise<ProviderHealthCheckResult>;
    /**
     * Health-checks all enabled providers with strict domain isolation.
     * The failure or timeout of one provider NEVER impacts any other provider.
     */
    checkAllEnabled(): Promise<ProviderHealthCheckResult[]>;
    /**
     * Retrieves historical health check audit logs for a provider.
     */
    getHealthLogs(providerId: string, limit?: number): Promise<{
        id: string;
        providerId: string;
        health: string;
        responseTimeMs: number;
        success: boolean;
        errorMessage: string | null;
        checkedAt: Date;
    }[]>;
}
export declare const providerHealthService: ProviderHealthService;
