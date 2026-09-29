import {
  ProviderInfo,
  ProviderConnectionTestResult,
  ProviderBalance,
  ProviderProduct,
  ProviderOrderRequest,
  ProviderOrderResult,
  ProviderOrderStatusResult,
  ProviderCancelOrderResult,
} from '../types/provider.types';

/**
 * Universal Provider Adapter Interface
 * All external cloud, hosting, domain, or service providers MUST implement this contract.
 * The marketplace core communicates exclusively through this normalized abstraction.
 */
export interface IProviderAdapter {
  /**
   * Unique machine identifier for this adapter (e.g., 'dev-provider', 'resellerclub', 'hetzner').
   */
  readonly providerCode: string;

  /**
   * Human-readable name for the provider.
   */
  readonly providerName: string;

  /**
   * Adapter integration specification version.
   */
  readonly version: string;

  /**
   * Tests network and authentication reachability to the external provider API.
   * Must execute within strict timeout boundaries and never throw uncaught exceptions.
   */
  testConnection(): Promise<ProviderConnectionTestResult>;

  /**
   * Retrieves static metadata, capabilities, and supported services of the provider.
   */
  getProviderInfo(): Promise<ProviderInfo>;

  /**
   * Checks the marketplace account balance / credit limit with the external provider.
   * Optional if provider does not support balance queries.
   */
  checkBalance?(): Promise<ProviderBalance>;

  /**
   * Fetches provider product catalog normalized into standard marketplace product definitions.
   * Optional: catalog synchronization foundation.
   */
  syncCatalog?(): Promise<ProviderProduct[]>;

  /**
   * Retrieves single product details from provider catalog.
   */
  getProduct?(providerProductId: string): Promise<ProviderProduct | null>;

  /**
   * Fulfills an order with the external provider.
   * (Contract foundation for future Phase 8 order processing).
   */
  fulfillOrder?(orderRequest: ProviderOrderRequest): Promise<ProviderOrderResult>;

  /**
   * Checks status of an existing order with the external provider.
   */
  getOrderStatus?(providerOrderId: string): Promise<ProviderOrderStatusResult>;

  /**
   * Requests cancellation/termination of a provider service or order where supported.
   */
  cancelOrder?(providerOrderId: string): Promise<ProviderCancelOrderResult>;
}
