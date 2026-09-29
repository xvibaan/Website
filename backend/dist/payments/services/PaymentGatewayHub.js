"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentGatewayHub = exports.PaymentGatewayHub = void 0;
const development_gateway_1 = require("../gateways/development.gateway");
const razorpay_gateway_1 = require("../gateways/razorpay.gateway");
/**
 * Central Payment Gateway Hub.
 *
 * Manages the registry of supported payment gateways.
 * Decouples the marketplace core from individual payment providers,
 * ensuring new gateways can be added without modifying the wallet or transactions.
 */
class PaymentGatewayHub {
    gateways = new Map();
    defaultGatewayId;
    constructor() {
        const isProd = process.env.NODE_ENV === 'production';
        this.defaultGatewayId = process.env.PAYMENT_GATEWAY_DEFAULT || (isProd ? 'razorpay' : 'dev-gateway');
        // Register development adapter only in non-production environments
        if (!isProd) {
            const devGateway = new development_gateway_1.DevelopmentPaymentGateway();
            this.registerGateway(devGateway);
        }
        // Register razorpay adapter
        const razorpayGateway = new razorpay_gateway_1.RazorpayPaymentGateway();
        this.registerGateway(razorpayGateway);
    }
    /**
     * Registers a payment gateway instance in the hub.
     */
    registerGateway(gateway) {
        this.gateways.set(gateway.gatewayId.toLowerCase(), gateway);
    }
    /**
     * Resolves a gateway by identifier, or returns the default gateway.
     */
    getGateway(gatewayId) {
        const targetId = (gatewayId || this.defaultGatewayId).toLowerCase();
        const gateway = this.gateways.get(targetId);
        if (!gateway) {
            const err = new Error(`Unsupported or unregistered payment gateway: '${gatewayId || this.defaultGatewayId}'. Available: [${this.listSupportedGateways().join(', ')}]`);
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        return gateway;
    }
    /**
     * Checks if a gateway is registered.
     */
    hasGateway(gatewayId) {
        return this.gateways.has(gatewayId.toLowerCase());
    }
    /**
     * Returns a list of all registered gateway IDs.
     */
    listSupportedGateways() {
        return Array.from(this.gateways.keys());
    }
    getDefaultGatewayId() {
        return this.defaultGatewayId;
    }
}
exports.PaymentGatewayHub = PaymentGatewayHub;
exports.paymentGatewayHub = new PaymentGatewayHub();
