"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerHealthService = exports.ProviderHealthService = void 0;
const provider_repository_1 = require("../repositories/provider.repository");
const ProviderResolver_1 = require("./ProviderResolver");
const provider_timeout_1 = require("../utils/provider-timeout");
const alert_service_1 = require("../../admin/services/alert.service");
class ProviderHealthService {
    repo;
    resolver;
    timeoutMs;
    constructor(repo, resolver, timeoutMs) {
        this.repo = repo || provider_repository_1.providerRepository;
        this.resolver = resolver || ProviderResolver_1.providerResolver;
        this.timeoutMs = timeoutMs || provider_timeout_1.DEFAULT_PROVIDER_TIMEOUT_MS;
    }
    /**
     * Executes an isolated health check against a single provider.
     * Enforces strict timeout and exception boundaries — NEVER crashes the Fastify server.
     */
    async checkHealth(providerIdOrCode) {
        const startTime = Date.now();
        let providerId = providerIdOrCode;
        let providerCode = providerIdOrCode;
        try {
            // Resolve provider and adapter for inspection
            const { provider, adapter } = await this.resolver.resolveForInspection(providerIdOrCode);
            providerId = provider.id;
            providerCode = provider.code;
            // Execute adapter connection test under strict timeout
            const testResult = await (0, provider_timeout_1.withTimeout)(adapter.testConnection(), this.timeoutMs, provider.code);
            const responseTimeMs = Date.now() - startTime;
            const checkedAt = new Date();
            if (testResult.success) {
                // Success: update DB state and record log
                await this.repo.updateHealth(provider.id, {
                    operationalHealth: 'HEALTHY',
                    lastHealthCheckAt: checkedAt,
                    lastSuccessfulHealthCheckAt: checkedAt,
                    failureCount: 0,
                    lastHealthResponseTimeMs: responseTimeMs,
                    lastHealthErrorMessage: null,
                });
                await this.repo.recordHealthLog({
                    providerId: provider.id,
                    health: 'HEALTHY',
                    responseTimeMs,
                    success: true,
                    errorMessage: null,
                    checkedAt,
                });
                if (responseTimeMs > 2000) { // 2 seconds latency threshold for example
                    alert_service_1.alertService.raiseAlert({
                        type: 'PROVIDER_OUTAGE',
                        severity: 'MEDIUM',
                        message: `High response latency detected for provider ${provider.code}: ${responseTimeMs}ms`,
                        details: { providerId: provider.id, providerCode: provider.code, responseTimeMs },
                    }).catch(console.error);
                }
                return {
                    providerId: provider.id,
                    providerCode: provider.code,
                    health: 'HEALTHY',
                    responseTimeMs,
                    lastCheckedAt: checkedAt,
                    success: true,
                    details: testResult.details,
                };
            }
            else {
                // Returned failure within adapter
                const sanitizedErr = (0, provider_timeout_1.sanitizeProviderError)(testResult.error || testResult.message);
                const isTimeout = responseTimeMs >= this.timeoutMs;
                const updatedProvider = await this.repo.updateHealth(provider.id, {
                    operationalHealth: 'UNHEALTHY',
                    lastHealthCheckAt: checkedAt,
                    lastFailedHealthCheckAt: checkedAt,
                    lastHealthResponseTimeMs: responseTimeMs,
                    lastHealthErrorMessage: sanitizedErr,
                });
                alert_service_1.alertService.raiseAlert({
                    type: 'PROVIDER_OUTAGE',
                    severity: updatedProvider && updatedProvider.failureCount >= 3 ? 'CRITICAL' : 'HIGH',
                    message: `Health check failed for provider ${provider.code}${isTimeout ? ' (Timeout)' : ''}`,
                    details: {
                        providerId: provider.id,
                        providerCode: provider.code,
                        errorMessage: sanitizedErr,
                        consecutiveFailures: updatedProvider?.failureCount || 1,
                        isTimeout
                    },
                }).catch(console.error);
                await this.repo.recordHealthLog({
                    providerId: provider.id,
                    health: 'UNHEALTHY',
                    responseTimeMs,
                    success: false,
                    errorMessage: sanitizedErr,
                    checkedAt,
                });
                return {
                    providerId: provider.id,
                    providerCode: provider.code,
                    health: 'UNHEALTHY',
                    responseTimeMs,
                    lastCheckedAt: checkedAt,
                    success: false,
                    errorMessage: sanitizedErr,
                };
            }
        }
        catch (error) {
            // Catch exceptions and timeouts safely
            const responseTimeMs = Date.now() - startTime;
            const checkedAt = new Date();
            const sanitizedErr = (0, provider_timeout_1.sanitizeProviderError)(error);
            const isTimeout = responseTimeMs >= this.timeoutMs;
            // Attempt to record failure in DB if provider exists
            try {
                const dbProvider = await this.repo.findById(providerId) || await this.repo.findByCode(providerCode);
                if (dbProvider) {
                    const updatedProvider = await this.repo.updateHealth(dbProvider.id, {
                        operationalHealth: 'UNHEALTHY',
                        lastHealthCheckAt: checkedAt,
                        lastFailedHealthCheckAt: checkedAt,
                        lastHealthResponseTimeMs: responseTimeMs,
                        lastHealthErrorMessage: sanitizedErr,
                    });
                    alert_service_1.alertService.raiseAlert({
                        type: 'PROVIDER_OUTAGE',
                        severity: updatedProvider && updatedProvider.failureCount >= 3 ? 'CRITICAL' : 'HIGH',
                        message: `Health check exception for provider ${dbProvider.code}${isTimeout ? ' (Timeout)' : ''}`,
                        details: {
                            providerId: dbProvider.id,
                            providerCode: dbProvider.code,
                            errorMessage: sanitizedErr,
                            consecutiveFailures: updatedProvider?.failureCount || 1,
                            isTimeout
                        },
                    }).catch(console.error);
                    await this.repo.recordHealthLog({
                        providerId: dbProvider.id,
                        health: 'UNHEALTHY',
                        responseTimeMs,
                        success: false,
                        errorMessage: sanitizedErr,
                        checkedAt,
                    });
                }
            }
            catch (logErr) {
                // Silently prevent logging errors from throwing
            }
            return {
                providerId,
                providerCode,
                health: 'UNHEALTHY',
                responseTimeMs,
                lastCheckedAt: checkedAt,
                success: false,
                errorMessage: sanitizedErr,
            };
        }
    }
    /**
     * Health-checks all enabled providers with strict domain isolation.
     * The failure or timeout of one provider NEVER impacts any other provider.
     */
    async checkAllEnabled() {
        const { providers: enabledProviders } = await this.repo.findAll({ isEnabled: true });
        const results = await Promise.allSettled(enabledProviders.map((p) => this.checkHealth(p.id)));
        return results.map((res, index) => {
            if (res.status === 'fulfilled') {
                return res.value;
            }
            return {
                providerId: enabledProviders[index].id,
                providerCode: enabledProviders[index].code,
                health: 'UNHEALTHY',
                responseTimeMs: 0,
                lastCheckedAt: new Date(),
                success: false,
                errorMessage: (0, provider_timeout_1.sanitizeProviderError)(res.reason),
            };
        });
    }
    /**
     * Retrieves historical health check audit logs for a provider.
     */
    async getHealthLogs(providerId, limit = 20) {
        return this.repo.getHealthLogs(providerId, limit);
    }
}
exports.ProviderHealthService = ProviderHealthService;
exports.providerHealthService = new ProviderHealthService();
