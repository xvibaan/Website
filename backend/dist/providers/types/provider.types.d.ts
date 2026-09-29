/**
 * Normalized Provider Types
 * Defines the unified data contracts for all infrastructure and service providers.
 * Isolates the marketplace core from vendor-specific response payloads.
 */
export type ProviderOperationalHealth = 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED' | 'UNKNOWN';
export type ProviderBusinessStatus = 'ACTIVE' | 'DISABLED' | 'MAINTENANCE';
export interface ProviderInfo {
    code: string;
    name: string;
    version: string;
    description?: string;
    adapterType: string;
    capabilities: string[];
    supportedServices: string[];
}
export interface ProviderConnectionTestResult {
    success: boolean;
    responseTimeMs: number;
    message: string;
    timestamp: Date;
    error?: string;
    details?: Record<string, any>;
}
export interface ProviderHealthCheckResult {
    providerId: string;
    providerCode: string;
    health: ProviderOperationalHealth;
    responseTimeMs: number;
    lastCheckedAt: Date;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
}
export interface ProviderBalance {
    currency: string;
    balance: string;
    creditLimit?: string;
    updatedAt: Date;
}
export interface ProviderProduct {
    providerProductId: string;
    name: string;
    category: string;
    costPrice: string;
    currency: string;
    status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    specs?: Record<string, any>;
}
export interface ProviderOrderRequest {
    orderReference: string;
    providerProductId: string;
    quantity: number;
    config?: Record<string, any>;
}
export interface ProviderOrderResult {
    providerOrderId: string;
    status: 'PENDING' | 'ACTIVE' | 'FAILED';
    rawStatus?: string;
    message?: string;
    createdAt: Date;
}
export interface ProviderOrderStatusResult {
    providerOrderId: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'FAILED';
    rawStatus?: string;
    details?: Record<string, any>;
    updatedAt: Date;
}
export interface ProviderCancelOrderResult {
    success: boolean;
    message?: string;
}
/**
 * Safe Provider Entity
 * Strips out sensitive fields (like encrypted credentials) before exposing via APIs.
 */
export interface SafeProvider {
    id: string;
    code: string;
    name: string;
    adapterType: string;
    description: string | null;
    isEnabled: boolean;
    isMaintenance: boolean;
    state?: ProviderBusinessStatus;
    operationalHealth: ProviderOperationalHealth;
    healthStatus?: ProviderOperationalHealth;
    isCredentialsConfigured?: boolean;
    priority: number;
    lastHealthCheckAt: Date | null;
    lastSuccessfulHealthCheckAt: Date | null;
    lastSuccessfulRequestAt?: string | null;
    lastFailedHealthCheckAt: Date | null;
    lastErrorAt?: string | null;
    failureCount: number;
    lastHealthResponseTimeMs: number | null;
    lastHealthErrorMessage: string | null;
    lastErrorMessage?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
