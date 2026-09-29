"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookVerificationService = exports.WebhookVerificationService = void 0;
const PaymentGatewayHub_1 = require("./PaymentGatewayHub");
const alert_service_1 = require("../../admin/services/alert.service");
class WebhookVerificationService {
    hub;
    constructor(hub) {
        this.hub = hub || PaymentGatewayHub_1.paymentGatewayHub;
    }
    /**
     * Cryptographically verifies an incoming webhook using raw body bytes and headers.
     * Never leaks or logs webhook secrets.
     */
    async verifyWebhook(gatewayId, headers, rawBody) {
        const gateway = this.hub.getGateway(gatewayId);
        const result = await gateway.verifyWebhook({
            headers,
            rawBody,
        });
        if (!result.isValid || !result.event) {
            alert_service_1.alertService.raiseAlert({
                type: 'WEBHOOK_FAILURE',
                severity: 'HIGH',
                message: `Webhook signature verification failed for gateway ${gatewayId}`,
                details: { error: result.error, gatewayId },
            }).catch(console.error);
            const err = new Error(result.error || 'Webhook verification failed: invalid signature or payload');
            err.statusCode = 401;
            err.name = 'Unauthorized';
            throw err;
        }
        return result.event;
    }
}
exports.WebhookVerificationService = WebhookVerificationService;
exports.webhookVerificationService = new WebhookVerificationService();
