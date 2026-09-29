import { PaymentGatewayHub, paymentGatewayHub } from './PaymentGatewayHub';
import { NormalizedWebhookEvent, WebhookVerificationResult } from '../payment.types';
import { alertService } from '../../admin/services/alert.service';

export class WebhookVerificationService {
  private hub: PaymentGatewayHub;

  constructor(hub?: PaymentGatewayHub) {
    this.hub = hub || paymentGatewayHub;
  }

  /**
   * Cryptographically verifies an incoming webhook using raw body bytes and headers.
   * Never leaks or logs webhook secrets.
   */
  async verifyWebhook(
    gatewayId: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): Promise<NormalizedWebhookEvent> {
    const gateway = this.hub.getGateway(gatewayId);

    const result: WebhookVerificationResult = await gateway.verifyWebhook({
      headers,
      rawBody,
    });

    if (!result.isValid || !result.event) {
      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `Webhook signature verification failed for gateway ${gatewayId}`,
        details: { error: result.error, gatewayId },
      }).catch(console.error);

      const err: any = new Error(result.error || 'Webhook verification failed: invalid signature or payload');
      err.statusCode = 401;
      err.name = 'Unauthorized';
      throw err;
    }

    return result.event;
  }
}

export const webhookVerificationService = new WebhookVerificationService();
