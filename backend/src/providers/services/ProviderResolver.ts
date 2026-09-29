import { providerRepository, ProviderRepository } from '../repositories/provider.repository';
import { providerRegistry, ProviderRegistry } from '../registry/ProviderRegistry';
import { IProviderAdapter } from '../interfaces/IProviderAdapter';
import { SafeProvider } from '../types/provider.types';
import {
  ProviderDisabledError,
  ProviderMaintenanceError,
  ProviderAdapterNotFoundError,
} from '../utils/provider-timeout';

export interface ResolvedProvider {
  provider: SafeProvider;
  adapter: IProviderAdapter;
}

/**
 * Provider Resolver Service
 * Safely resolves a provider from the database and matches it to its registered adapter.
 * Enforces business availability rules (enabled/maintenance) while isolating failure domains.
 */
export class ProviderResolver {
  private repo: ProviderRepository;
  private registry: ProviderRegistry;

  constructor(repo?: ProviderRepository, registry?: ProviderRegistry) {
    this.repo = repo || providerRepository;
    this.registry = registry || providerRegistry;
  }

  /**
   * Resolves an operational provider for new business operations.
   * Enforces:
   * 1. Existence
   * 2. Enabled flag
   * 3. Not in maintenance
   * 4. Registered adapter
   */
  async resolveActive(providerIdOrCode: string): Promise<ResolvedProvider> {
    const { provider, adapter } = await this.resolveEntity(providerIdOrCode);

    if (!provider.isEnabled) {
      throw new ProviderDisabledError(provider.code);
    }

    if (provider.isMaintenance) {
      throw new ProviderMaintenanceError(provider.code);
    }

    return { provider, adapter };
  }

  /**
   * Resolves a provider for administrative inspection, testing, or health checking.
   * Allows resolving even if disabled or under maintenance so administrators can diagnose issues.
   */
  async resolveForInspection(providerIdOrCode: string): Promise<ResolvedProvider> {
    return this.resolveEntity(providerIdOrCode);
  }

  private async resolveEntity(providerIdOrCode: string): Promise<ResolvedProvider> {
    if (!providerIdOrCode || typeof providerIdOrCode !== 'string') {
      const err: any = new Error('Provider identifier must be a valid non-empty string');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      providerIdOrCode
    );

    const dbProvider = isUuid
      ? await this.repo.findById(providerIdOrCode)
      : await this.repo.findByCode(providerIdOrCode);

    if (!dbProvider) {
      const err: any = new Error(`Provider '${providerIdOrCode}' not found`);
      err.statusCode = 404;
      err.name = 'NotFound';
      throw err;
    }

    const adapter = this.registry.getAdapter(dbProvider.code);
    if (!adapter) {
      throw new ProviderAdapterNotFoundError(dbProvider.code);
    }

    return {
      provider: this.repo.toSafeProvider(dbProvider),
      adapter,
    };
  }
}

export const providerResolver = new ProviderResolver();
