"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerResolver = exports.ProviderResolver = void 0;
const provider_repository_1 = require("../repositories/provider.repository");
const ProviderRegistry_1 = require("../registry/ProviderRegistry");
const provider_timeout_1 = require("../utils/provider-timeout");
/**
 * Provider Resolver Service
 * Safely resolves a provider from the database and matches it to its registered adapter.
 * Enforces business availability rules (enabled/maintenance) while isolating failure domains.
 */
class ProviderResolver {
    repo;
    registry;
    constructor(repo, registry) {
        this.repo = repo || provider_repository_1.providerRepository;
        this.registry = registry || ProviderRegistry_1.providerRegistry;
    }
    /**
     * Resolves an operational provider for new business operations.
     * Enforces:
     * 1. Existence
     * 2. Enabled flag
     * 3. Not in maintenance
     * 4. Registered adapter
     */
    async resolveActive(providerIdOrCode) {
        const { provider, adapter } = await this.resolveEntity(providerIdOrCode);
        if (!provider.isEnabled) {
            throw new provider_timeout_1.ProviderDisabledError(provider.code);
        }
        if (provider.isMaintenance) {
            throw new provider_timeout_1.ProviderMaintenanceError(provider.code);
        }
        return { provider, adapter };
    }
    /**
     * Resolves a provider for administrative inspection, testing, or health checking.
     * Allows resolving even if disabled or under maintenance so administrators can diagnose issues.
     */
    async resolveForInspection(providerIdOrCode) {
        return this.resolveEntity(providerIdOrCode);
    }
    async resolveEntity(providerIdOrCode) {
        if (!providerIdOrCode || typeof providerIdOrCode !== 'string') {
            const err = new Error('Provider identifier must be a valid non-empty string');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerIdOrCode);
        const dbProvider = isUuid
            ? await this.repo.findById(providerIdOrCode)
            : await this.repo.findByCode(providerIdOrCode);
        if (!dbProvider) {
            const err = new Error(`Provider '${providerIdOrCode}' not found`);
            err.statusCode = 404;
            err.name = 'NotFound';
            throw err;
        }
        const adapter = this.registry.getAdapter(dbProvider.code);
        if (!adapter) {
            throw new provider_timeout_1.ProviderAdapterNotFoundError(dbProvider.code);
        }
        return {
            provider: this.repo.toSafeProvider(dbProvider),
            adapter,
        };
    }
}
exports.ProviderResolver = ProviderResolver;
exports.providerResolver = new ProviderResolver();
