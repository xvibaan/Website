import { PaymentGatewayHub } from './PaymentGatewayHub';
import { NormalizedWebhookEvent } from '../payment.types';
export declare class WebhookVerificationService {
    private hub;
    constructor(hub?: PaymentGatewayHub);
    /**
     * Cryptographically verifies an incoming webhook using raw body bytes and headers.
     * Never leaks or logs webhook secrets.
     */
    verifyWebhook(gatewayId: string, headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string): Promise<NormalizedWebhookEvent>;
}
export declare const webhookVerificationService: WebhookVerificationService;
