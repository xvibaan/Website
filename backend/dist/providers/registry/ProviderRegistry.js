"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRegistry = exports.ProviderRegistry = void 0;
/**
 * Provider Registry
 * Central, extensible in-memory registry of all loaded provider adapters.
 * Prevents marketplace core from requiring hardcoded `if (provider === 'X')` branches.
 */
class ProviderRegistry {
    adapters = new Map();
    /**
     * Registers a provider adapter.
     * Throws an error if an adapter with the same providerCode is already registered.
     */
    registerAdapter(adapter) {
        if (!adapter) {
            throw new Error('Cannot register null or undefined provider adapter');
        }
        if (!adapter.providerCode || typeof adapter.providerCode !== 'string') {
            throw new Error('Adapter must provide a valid string providerCode');
        }
        const normalizedCode = adapter.providerCode.toLowerCase().trim();
        if (this.adapters.has(normalizedCode)) {
            throw new Error(`Provider adapter for code '${normalizedCode}' is already registered`);
        }
        this.adapters.set(normalizedCode, adapter);
    }
    /**
     * Retrieves a registered adapter by provider code.
     */
    getAdapter(providerCode) {
        if (!providerCode)
            return undefined;
        return this.adapters.get(providerCode.toLowerCase().trim());
    }
    /**
     * Checks whether an adapter is registered.
     */
    hasAdapter(providerCode) {
        if (!providerCode)
            return false;
        return this.adapters.has(providerCode.toLowerCase().trim());
    }
    /**
     * Lists all registered provider adapters with normalized summary info.
     */
    listAdapters() {
        return Array.from(this.adapters.values()).map((adapter) => ({
            code: adapter.providerCode,
            name: adapter.providerName,
            version: adapter.version,
        }));
    }
    /**
     * Unregisters an adapter (primarily used for test suite isolation).
     */
    unregisterAdapter(providerCode) {
        if (!providerCode)
            return false;
        return this.adapters.delete(providerCode.toLowerCase().trim());
    }
    /**
     * Clears all registered adapters (for testing).
     */
    clear() {
        this.adapters.clear();
    }
}
exports.ProviderRegistry = ProviderRegistry;
exports.providerRegistry = new ProviderRegistry();
