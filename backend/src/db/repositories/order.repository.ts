import { eq, desc, and, inArray } from 'drizzle-orm';
import { getDb, DbTransaction } from '../client';
import { orders, orderItems, Order, NewOrder, OrderItem, NewOrderItem } from '../schema/orders';

export class OrderRepository {
  async createOrder(data: NewOrder, tx?: DbTransaction): Promise<Order> {
    const db = tx || getDb();
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async createOrderItem(data: NewOrderItem, tx?: DbTransaction): Promise<OrderItem> {
    const db = tx || getDb();
    const [item] = await db.insert(orderItems).values(data).returning();
    return item;
  }

  async findOrdersByUserId(userId: string, tx?: DbTransaction): Promise<Order[]> {
    const db = tx || getDb();
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async findOrderItemsByOrderId(orderId: number, tx?: DbTransaction): Promise<OrderItem[]> {
    const db = tx || getDb();
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async findOrderByIdAndUserId(orderId: number, userId: string, tx?: DbTransaction): Promise<Order | undefined> {
    const db = tx || getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
    return order;
  }

  async findOrderByReference(reference: string, tx?: DbTransaction): Promise<Order | undefined> {
    const db = tx || getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.reference, reference));
    return order;
  }

  async updateOrder(orderId: number, data: Partial<NewOrder>, tx?: DbTransaction): Promise<Order> {
    const db = tx || getDb();
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async findProcessingOrdersForUpdate(limit: number, tx: DbTransaction): Promise<Order[]> {
    return await tx
      .select()
      .from(orders)
      .where(inArray(orders.status, ['PENDING', 'PROCESSING']))
      .limit(limit)
      .for('update', { skipLocked: true });
  }
}

export const orderRepository = new OrderRepository();
