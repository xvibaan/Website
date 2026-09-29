"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = exports.OrderRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const orders_1 = require("../schema/orders");
class OrderRepository {
    async createOrder(data, tx) {
        const db = tx || (0, client_1.getDb)();
        const [order] = await db.insert(orders_1.orders).values(data).returning();
        return order;
    }
    async createOrderItem(data, tx) {
        const db = tx || (0, client_1.getDb)();
        const [item] = await db.insert(orders_1.orderItems).values(data).returning();
        return item;
    }
    async findOrdersByUserId(userId, tx) {
        const db = tx || (0, client_1.getDb)();
        return await db
            .select()
            .from(orders_1.orders)
            .where((0, drizzle_orm_1.eq)(orders_1.orders.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(orders_1.orders.createdAt));
    }
    async findOrderItemsByOrderId(orderId, tx) {
        const db = tx || (0, client_1.getDb)();
        return await db
            .select()
            .from(orders_1.orderItems)
            .where((0, drizzle_orm_1.eq)(orders_1.orderItems.orderId, orderId));
    }
    async findOrderByIdAndUserId(orderId, userId, tx) {
        const db = tx || (0, client_1.getDb)();
        const [order] = await db
            .select()
            .from(orders_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(orders_1.orders.id, orderId), (0, drizzle_orm_1.eq)(orders_1.orders.userId, userId)));
        return order;
    }
    async findOrderByReference(reference, tx) {
        const db = tx || (0, client_1.getDb)();
        const [order] = await db
            .select()
            .from(orders_1.orders)
            .where((0, drizzle_orm_1.eq)(orders_1.orders.reference, reference));
        return order;
    }
    async updateOrder(orderId, data, tx) {
        const db = tx || (0, client_1.getDb)();
        const [order] = await db
            .update(orders_1.orders)
            .set({ ...data, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(orders_1.orders.id, orderId))
            .returning();
        return order;
    }
    async findProcessingOrdersForUpdate(limit, tx) {
        return await tx
            .select()
            .from(orders_1.orders)
            .where((0, drizzle_orm_1.inArray)(orders_1.orders.status, ['PENDING', 'PROCESSING']))
            .limit(limit)
            .for('update', { skipLocked: true });
    }
}
exports.OrderRepository = OrderRepository;
exports.orderRepository = new OrderRepository();
