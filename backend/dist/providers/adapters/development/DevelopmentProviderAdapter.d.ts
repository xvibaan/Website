import { IProviderAdapter } from '../../interfaces/IProviderAdapter';
import { ProviderInfo, ProviderConnectionTestResult, ProviderBalance, ProviderProduct, ProviderOrderRequest, ProviderOrderResult, ProviderOrderStatusResult, ProviderCancelOrderResult } from '../../types/provider.types';
export type SimulationMode = 'HEALTHY' | 'TIMEOUT' | 'ERROR';
/**
 * ==============================================================================
 * TEST / DEVELOPMENT ONLY
 * ==============================================================================
 * DevelopmentProviderAdapter is designed strictly for automated test suites,
 * local development, registry verification, and health state simulation.
 * It DOES NOT connect to real external infrastructure and MUST NOT be used in production.
 * ==============================================================================
 */
export declare class DevelopmentProviderAdapter implements IProviderAdapter {
    readonly providerCode: string;
    readonly providerName: string;
    readonly version: string;
    private simulationMode;
    private simulatedDelayMs;
    constructor(providerCode?: string, providerName?: string);
    private assertNonProduction;
    /**
     * Sets the simulation mode for testing health transitions and failure isolation.
     */
    setSimulationMode(mode: SimulationMode, delayMs?: number): void;
    getSimulationMode(): SimulationMode;
    testConnection(): Promise<ProviderConnectionTestResult>;
    getProviderInfo(): Promise<ProviderInfo>;
    checkBalance(): Promise<ProviderBalance>;
    syncCatalog(): Promise<ProviderProduct[]>;
    getProduct(providerProductId: string): Promise<ProviderProduct | null>;
    fulfillOrder(orderRequest: ProviderOrderRequest): Promise<ProviderOrderResult>;
    getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatusResult>;
    cancelOrder(providerOrderId: string): Promise<ProviderCancelOrderResult>;
}
