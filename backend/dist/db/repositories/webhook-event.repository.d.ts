import { DbClient, DbTransaction } from '../client';
import { WebhookEvent, NewWebhookEvent } from '../schema/webhook-events';
export declare class WebhookEventRepository {
    private db;
    constructor(db?: DbClient);
    create(data: NewWebhookEvent, tx?: DbTransaction): Promise<WebhookEvent>;
    findByGatewayAndEventId(gateway: string, gatewayEventId: string, tx?: DbTransaction): Promise<WebhookEvent | null>;
}
export declare const webhookEventRepository: WebhookEventRepository;
