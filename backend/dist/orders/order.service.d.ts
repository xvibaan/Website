export declare class OrderService {
    createOrder(userId: string, productId: string, quantity?: number, idempotencyKey?: string, variantId?: string): Promise<{
        orderId: number;
        id: number;
        userId: string;
        productId: string;
        variantId: string | undefined;
        variantName: string | undefined;
        amount: number;
        totalAmount: string;
        currency: string;
        status: string;
        deliveryStatus: string;
        paymentStatus: string;
        reference: string | null;
        createdAt: Date;
        items: {
            id: number;
            productId: string | null;
            productNameSnapshot: string;
            variantNameSnapshot: string;
            priceAtPurchase: number;
            faceValue: number | null;
            discountPercent: number | null;
            quantity: number;
            fulfillmentStatus: string;
        }[];
    }>;
    /**
     * Safely refunds a failed order.
     * Requires strict idempotency to prevent duplicate refunds.
     */
    private recoverFailedOrder;
    /**
     * Reconciles a single order, safely acquiring a row lock via a two-stage claim.
     * This prevents blocking the PostgreSQL pool during slow HTTP provider calls.
     */
    reconcileSingleOrder(orderId: number): Promise<void>;
    /**
     * Batch reconciles processing orders.
     */
    reconcileProcessingOrders(limit?: number): Promise<void>;
    getCustomerOrders(userId: string): Promise<{
        id: number;
        userId: string;
        user_id: string;
        totalAmount: number;
        total_amount: number;
        status: string;
        paymentStatus: string;
        payment_status: string;
        paymentMethod: string;
        payment_method: string;
        deliveryStatus: string;
        delivery_status: string;
        createdAt: string;
        created_at: string;
        items: {
            id: number;
            productNameSnapshot: string;
            product_name_snapshot: string;
            variantNameSnapshot: string;
            variant_name_snapshot: string;
            priceAtPurchase: number;
            price_at_purchase: number;
            faceValue: number;
            face_value: number;
            discountPercent: number;
            discount_percent: number;
            category: string | null;
            categorySnapshot: string | null;
            fulfillmentStatus: string;
            fulfillment_status: string;
            quantity: number;
            product_key: {
                key_value: string;
            } | undefined;
        }[];
    }[]>;
}
export declare const orderService: OrderService;
