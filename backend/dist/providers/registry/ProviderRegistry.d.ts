import { IProviderAdapter } from '../interfaces/IProviderAdapter';
/**
 * Provider Registry
 * Central, extensible in-memory registry of all loaded provider adapters.
 * Prevents marketplace core from requiring hardcoded `if (provider === 'X')` branches.
 */
export declare class ProviderRegistry {
    private adapters;
    /**
     * Registers a provider adapter.
     * Throws an error if an adapter with the same providerCode is already registered.
     */
    registerAdapter(adapter: IProviderAdapter): void;
    /**
     * Retrieves a registered adapter by provider code.
     */
    getAdapter(providerCode: string): IProviderAdapter | undefined;
    /**
     * Checks whether an adapter is registered.
     */
    hasAdapter(providerCode: string): boolean;
    /**
     * Lists all registered provider adapters with normalized summary info.
     */
    listAdapters(): Array<{
        code: string;
        name: string;
        version: string;
    }>;
    /**
     * Unregisters an adapter (primarily used for test suite isolation).
     */
    unregisterAdapter(providerCode: string): boolean;
    /**
     * Clears all registered adapters (for testing).
     */
    clear(): void;
}
export declare const providerRegistry: ProviderRegistry;
