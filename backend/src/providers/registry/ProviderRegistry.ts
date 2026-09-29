import { IProviderAdapter } from '../interfaces/IProviderAdapter';

/**
 * Provider Registry
 * Central, extensible in-memory registry of all loaded provider adapters.
 * Prevents marketplace core from requiring hardcoded `if (provider === 'X')` branches.
 */
export class ProviderRegistry {
  private adapters = new Map<string, IProviderAdapter>();

  /**
   * Registers a provider adapter.
   * Throws an error if an adapter with the same providerCode is already registered.
   */
  public registerAdapter(adapter: IProviderAdapter): void {
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
  public getAdapter(providerCode: string): IProviderAdapter | undefined {
    if (!providerCode) return undefined;
    return this.adapters.get(providerCode.toLowerCase().trim());
  }

  /**
   * Checks whether an adapter is registered.
   */
  public hasAdapter(providerCode: string): boolean {
    if (!providerCode) return false;
    return this.adapters.has(providerCode.toLowerCase().trim());
  }

  /**
   * Lists all registered provider adapters with normalized summary info.
   */
  public listAdapters(): Array<{ code: string; name: string; version: string }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      code: adapter.providerCode,
      name: adapter.providerName,
      version: adapter.version,
    }));
  }

  /**
   * Unregisters an adapter (primarily used for test suite isolation).
   */
  public unregisterAdapter(providerCode: string): boolean {
    if (!providerCode) return false;
    return this.adapters.delete(providerCode.toLowerCase().trim());
  }

  /**
   * Clears all registered adapters (for testing).
   */
  public clear(): void {
    this.adapters.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
