import { eq, and } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../client';
import { webhookEvents, WebhookEvent, NewWebhookEvent } from '../schema/webhook-events';

export class WebhookEventRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async create(data: NewWebhookEvent, tx?: DbTransaction): Promise<WebhookEvent> {
    const executor = tx || this.db;
    const result = await executor
      .insert(webhookEvents)
      .values(data)
      .returning();

    return result[0];
  }

  async findByGatewayAndEventId(
    gateway: string,
    gatewayEventId: string,
    tx?: DbTransaction
  ): Promise<WebhookEvent | null> {
    const executor = tx || this.db;
    const result = await executor
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.gateway, gateway),
          eq(webhookEvents.gatewayEventId, gatewayEventId)
        )
      )
      .limit(1);

    return result[0] || null;
  }
}

export const webhookEventRepository = new WebhookEventRepository();
