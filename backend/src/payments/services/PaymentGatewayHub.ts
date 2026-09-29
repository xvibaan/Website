import { IPaymentGateway } from '../interfaces/IPaymentGateway';
import { DevelopmentPaymentGateway } from '../gateways/development.gateway';
import { RazorpayPaymentGateway } from '../gateways/razorpay.gateway';

/**
 * Central Payment Gateway Hub.
 *
 * Manages the registry of supported payment gateways.
 * Decouples the marketplace core from individual payment providers,
 * ensuring new gateways can be added without modifying the wallet or transactions.
 */
export class PaymentGatewayHub {
  private gateways: Map<string, IPaymentGateway> = new Map();
  private defaultGatewayId: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.defaultGatewayId = process.env.PAYMENT_GATEWAY_DEFAULT || (isProd ? 'razorpay' : 'dev-gateway');

    // Register development adapter only in non-production environments
    if (!isProd) {
      const devGateway = new DevelopmentPaymentGateway();
      this.registerGateway(devGateway);
    }

    // Register razorpay adapter
    const razorpayGateway = new RazorpayPaymentGateway();
    this.registerGateway(razorpayGateway);
  }

  /**
   * Registers a payment gateway instance in the hub.
   */
  registerGateway(gateway: IPaymentGateway): void {
    this.gateways.set(gateway.gatewayId.toLowerCase(), gateway);
  }

  /**
   * Resolves a gateway by identifier, or returns the default gateway.
   */
  getGateway(gatewayId?: string): IPaymentGateway {
    const targetId = (gatewayId || this.defaultGatewayId).toLowerCase();
    const gateway = this.gateways.get(targetId);

    if (!gateway) {
      const err: any = new Error(
        `Unsupported or unregistered payment gateway: '${gatewayId || this.defaultGatewayId}'. Available: [${this.listSupportedGateways().join(', ')}]`
      );
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    return gateway;
  }

  /**
   * Checks if a gateway is registered.
   */
  hasGateway(gatewayId: string): boolean {
    return this.gateways.has(gatewayId.toLowerCase());
  }

  /**
   * Returns a list of all registered gateway IDs.
   */
  listSupportedGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  getDefaultGatewayId(): string {
    return this.defaultGatewayId;
  }
}

export const paymentGatewayHub = new PaymentGatewayHub();
