"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevelopmentProviderAdapter = void 0;
/**
 * ==============================================================================
 * TEST / DEVELOPMENT ONLY
 * ==============================================================================
 * DevelopmentProviderAdapter is designed strictly for automated test suites,
 * local development, registry verification, and health state simulation.
 * It DOES NOT connect to real external infrastructure and MUST NOT be used in production.
 * ==============================================================================
 */
class DevelopmentProviderAdapter {
    providerCode;
    providerName;
    version = '1.0.0';
    simulationMode = 'HEALTHY';
    simulatedDelayMs = 10;
    constructor(providerCode = 'dev-provider', providerName = 'Development / Test Provider') {
        this.providerCode = providerCode.toLowerCase().trim();
        this.providerName = providerName;
    }
    assertNonProduction() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Critical Security Violation: DevelopmentProviderAdapter cannot execute in production environment.');
        }
    }
    /**
     * Sets the simulation mode for testing health transitions and failure isolation.
     */
    setSimulationMode(mode, delayMs = 10) {
        this.assertNonProduction();
        this.simulationMode = mode;
        this.simulatedDelayMs = delayMs;
    }
    getSimulationMode() {
        return this.simulationMode;
    }
    async testConnection() {
        this.assertNonProduction();
        const startTime = Date.now();
        if (this.simulationMode === 'TIMEOUT') {
            // Simulate slow external upstream hanging beyond request timeout
            const delay = this.simulatedDelayMs > 100 ? this.simulatedDelayMs : 5000;
            await new Promise((resolve) => {
                const t = setTimeout(resolve, delay);
                if (typeof t === 'object' && t && 'unref' in t) {
                    t.unref();
                }
            });
            return {
                success: false,
                responseTimeMs: Date.now() - startTime,
                message: 'Simulation timeout triggered',
                timestamp: new Date(),
                error: 'Connection timed out',
            };
        }
        if (this.simulationMode === 'ERROR') {
            await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
            return {
                success: false,
                responseTimeMs: Date.now() - startTime,
                message: 'Simulated external provider service outage (503 Service Unavailable)',
                timestamp: new Date(),
                error: 'Provider upstream endpoint returned HTTP 503',
            };
        }
        // Default: HEALTHY
        await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
        return {
            success: true,
            responseTimeMs: Date.now() - startTime,
            message: 'Development provider connectivity test succeeded',
            timestamp: new Date(),
            details: {
                mockLatency: this.simulatedDelayMs,
                simulatedRegion: 'in-west-1',
            },
        };
    }
    async getProviderInfo() {
        return {
            code: this.providerCode,
            name: this.providerName,
            version: this.version,
            description: 'Development test harness provider adapter',
            adapterType: 'development_sandbox',
            capabilities: [
                'domain_registration',
                'vps_provisioning',
                'catalog_sync',
                'balance_check',
            ],
            supportedServices: ['cloud_servers', 'domains', 'shared_hosting'],
        };
    }
    async checkBalance() {
        return {
            currency: 'INR',
            balance: '50000.00',
            creditLimit: '100000.00',
            updatedAt: new Date(),
        };
    }
    async syncCatalog() {
        this.assertNonProduction();
        return [
            {
                providerProductId: 'dev-vps-basic',
                name: 'Sandbox VPS 1 vCPU / 2GB RAM',
                category: 'cloud_servers',
                costPrice: '450.00',
                currency: 'INR',
                status: 'AVAILABLE',
                specs: { cpu: 1, ram: '2GB', storage: '40GB NVMe' },
            },
            {
                providerProductId: 'dev-vps-pro',
                name: 'Sandbox VPS 2 vCPU / 4GB RAM',
                category: 'cloud_servers',
                costPrice: '900.00',
                currency: 'INR',
                status: 'AVAILABLE',
                specs: { cpu: 2, ram: '4GB', storage: '80GB NVMe' },
            },
        ];
    }
    async getProduct(providerProductId) {
        const catalog = await this.syncCatalog();
        return catalog.find((p) => p.providerProductId === providerProductId) || null;
    }
    async fulfillOrder(orderRequest) {
        this.assertNonProduction();
        const isFail = orderRequest.orderReference?.includes('FORCE_FAIL');
        const isTimeout = orderRequest.orderReference?.includes('FORCE_TIMEOUT');
        const isUnknown = orderRequest.orderReference?.includes('FORCE_UNKNOWN');
        if (isUnknown) {
            throw new Error('Simulated network timeout during purchase');
        }
        return {
            providerOrderId: `dev_ord_${Date.now()}_${orderRequest.orderReference || Math.random().toString(36).substring(2, 7)}`,
            status: isFail ? 'FAILED' : (isTimeout ? 'PENDING' : 'ACTIVE'),
            message: 'Simulated order fulfillment complete',
            createdAt: new Date(),
        };
    }
    async getOrderStatus(providerOrderId) {
        if (providerOrderId.includes('FORCE_TIMEOUT')) {
            throw new Error('Simulated network timeout during getOrderStatus');
        }
        // Dynamic recovery: If it includes RECOVER_FAIL, we simulate a final FAILED status after reconciliation
        const isFail = providerOrderId.includes('FORCE_FAIL') || providerOrderId.includes('RECOVER_FAIL');
        // If it includes RECOVER_SUCCESS, it finally succeeds.
        const isSuccess = providerOrderId.includes('RECOVER_SUCCESS') || (!isFail && !providerOrderId.includes('REMAIN_PROCESSING'));
        return {
            providerOrderId,
            status: isFail ? 'FAILED' : (isSuccess ? 'ACTIVE' : 'PENDING'),
            details: { ipAddress: '192.168.1.100', hostname: 'sandbox-node-1.test' },
            updatedAt: new Date(),
        };
    }
    async cancelOrder(providerOrderId) {
        return {
            success: true,
            message: `Simulated cancellation of order ${providerOrderId} succeeded`,
        };
    }
}
exports.DevelopmentProviderAdapter = DevelopmentProviderAdapter;
