import { IPaymentGateway } from '../interfaces/IPaymentGateway';
/**
 * Central Payment Gateway Hub.
 *
 * Manages the registry of supported payment gateways.
 * Decouples the marketplace core from individual payment providers,
 * ensuring new gateways can be added without modifying the wallet or transactions.
 */
export declare class PaymentGatewayHub {
    private gateways;
    private defaultGatewayId;
    constructor();
    /**
     * Registers a payment gateway instance in the hub.
     */
    registerGateway(gateway: IPaymentGateway): void;
    /**
     * Resolves a gateway by identifier, or returns the default gateway.
     */
    getGateway(gatewayId?: string): IPaymentGateway;
    /**
     * Checks if a gateway is registered.
     */
    hasGateway(gatewayId: string): boolean;
    /**
     * Returns a list of all registered gateway IDs.
     */
    listSupportedGateways(): string[];
    getDefaultGatewayId(): string;
}
export declare const paymentGatewayHub: PaymentGatewayHub;
