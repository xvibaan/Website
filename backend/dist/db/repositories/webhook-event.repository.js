"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookEventRepository = exports.WebhookEventRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const webhook_events_1 = require("../schema/webhook-events");
class WebhookEventRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    async create(data, tx) {
        const executor = tx || this.db;
        const result = await executor
            .insert(webhook_events_1.webhookEvents)
            .values(data)
            .returning();
        return result[0];
    }
    async findByGatewayAndEventId(gateway, gatewayEventId, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(webhook_events_1.webhookEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(webhook_events_1.webhookEvents.gateway, gateway), (0, drizzle_orm_1.eq)(webhook_events_1.webhookEvents.gatewayEventId, gatewayEventId)))
            .limit(1);
        return result[0] || null;
    }
}
exports.WebhookEventRepository = WebhookEventRepository;
exports.webhookEventRepository = new WebhookEventRepository();
