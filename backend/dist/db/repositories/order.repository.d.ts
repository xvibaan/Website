import { DbTransaction } from '../client';
import { Order, NewOrder, OrderItem, NewOrderItem } from '../schema/orders';
export declare class OrderRepository {
    createOrder(data: NewOrder, tx?: DbTransaction): Promise<Order>;
    createOrderItem(data: NewOrderItem, tx?: DbTransaction): Promise<OrderItem>;
    findOrdersByUserId(userId: string, tx?: DbTransaction): Promise<Order[]>;
    findOrderItemsByOrderId(orderId: number, tx?: DbTransaction): Promise<OrderItem[]>;
    findOrderByIdAndUserId(orderId: number, userId: string, tx?: DbTransaction): Promise<Order | undefined>;
    findOrderByReference(reference: string, tx?: DbTransaction): Promise<Order | undefined>;
    updateOrder(orderId: number, data: Partial<NewOrder>, tx?: DbTransaction): Promise<Order>;
    findProcessingOrdersForUpdate(limit: number, tx: DbTransaction): Promise<Order[]>;
}
export declare const orderRepository: OrderRepository;
