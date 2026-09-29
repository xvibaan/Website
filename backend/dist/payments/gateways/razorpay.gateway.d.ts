import { IPaymentGateway, CreateGatewayPaymentParams, VerifyPaymentResult, RefundGatewayPaymentParams, RefundGatewayPaymentResult } from '../interfaces/IPaymentGateway';
import { PaymentIntentResult, WebhookVerificationResult } from '../payment.types';
export declare class RazorpayPaymentGateway implements IPaymentGateway {
    readonly gatewayId = "razorpay";
    private razorpay;
    private webhookSecret;
    constructor();
    createPayment(params: CreateGatewayPaymentParams): Promise<PaymentIntentResult>;
    verifyWebhook(request: {
        headers: Record<string, string | string[] | undefined>;
        rawBody: Buffer | string;
    }): Promise<WebhookVerificationResult>;
    verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult>;
    refundPayment(params: RefundGatewayPaymentParams): Promise<RefundGatewayPaymentResult>;
}
