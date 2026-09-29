import { ProviderRepository } from '../repositories/provider.repository';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import { IProviderAdapter } from '../interfaces/IProviderAdapter';
import { SafeProvider } from '../types/provider.types';
export interface ResolvedProvider {
    provider: SafeProvider;
    adapter: IProviderAdapter;
}
/**
 * Provider Resolver Service
 * Safely resolves a provider from the database and matches it to its registered adapter.
 * Enforces business availability rules (enabled/maintenance) while isolating failure domains.
 */
export declare class ProviderResolver {
    private repo;
    private registry;
    constructor(repo?: ProviderRepository, registry?: ProviderRegistry);
    /**
     * Resolves an operational provider for new business operations.
     * Enforces:
     * 1. Existence
     * 2. Enabled flag
     * 3. Not in maintenance
     * 4. Registered adapter
     */
    resolveActive(providerIdOrCode: string): Promise<ResolvedProvider>;
    /**
     * Resolves a provider for administrative inspection, testing, or health checking.
     * Allows resolving even if disabled or under maintenance so administrators can diagnose issues.
     */
    resolveForInspection(providerIdOrCode: string): Promise<ResolvedProvider>;
    private resolveEntity;
}
export declare const providerResolver: ProviderResolver;
