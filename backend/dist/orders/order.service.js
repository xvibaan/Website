"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = exports.OrderService = void 0;
const client_1 = require("../db/client");
const order_repository_1 = require("../db/repositories/order.repository");
const wallet_service_1 = require("../wallet/wallet.service");
const products_1 = require("../db/schema/products");
const providers_1 = require("../db/schema/providers");
const product_variants_1 = require("../db/schema/product-variants");
const categories_1 = require("../db/schema/categories");
const orders_1 = require("../db/schema/orders");
const drizzle_orm_1 = require("drizzle-orm");
const ProviderRegistry_1 = require("../providers/registry/ProviderRegistry");
const ProviderResolver_1 = require("../providers/services/ProviderResolver");
const alert_service_1 = require("../admin/services/alert.service");
class OrderService {
    async createOrder(userId, productId, quantity = 1, idempotencyKey, variantId) {
        const db = (0, client_1.getDb)();
        // Idempotency Check
        if (idempotencyKey) {
            const existingOrder = await order_repository_1.orderRepository.findOrderByReference(idempotencyKey);
            if (existingOrder) {
                if (existingOrder.userId !== userId) {
                    const err = new Error('Idempotency key reused across different users');
                    err.statusCode = 409;
                    err.name = 'Conflict';
                    throw err;
                }
                const existingItems = await order_repository_1.orderRepository.findOrderItemsByOrderId(existingOrder.id);
                const firstItem = existingItems[0];
                return {
                    orderId: existingOrder.id,
                    id: existingOrder.id,
                    userId: existingOrder.userId,
                    productId: firstItem?.productId || productId,
                    variantId: variantId || undefined,
                    variantName: firstItem?.variantNameSnapshot || undefined,
                    amount: Number(existingOrder.totalAmount),
                    totalAmount: existingOrder.totalAmount,
                    currency: existingOrder.currency,
                    status: existingOrder.status,
                    deliveryStatus: existingOrder.deliveryStatus,
                    paymentStatus: existingOrder.paymentStatus,
                    reference: existingOrder.reference,
                    createdAt: existingOrder.createdAt,
                    items: existingItems.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        productNameSnapshot: item.productNameSnapshot,
                        variantNameSnapshot: item.variantNameSnapshot,
                        priceAtPurchase: Number(item.priceAtPurchase),
                        faceValue: item.faceValue ? Number(item.faceValue) : null,
                        discountPercent: item.discountPercent,
                        quantity: item.quantity,
                        fulfillmentStatus: item.fulfillmentStatus,
                    })),
                };
            }
        }
        // 1. Validate Product
        const [product] = await db
            .select()
            .from(products_1.products)
            .where((0, drizzle_orm_1.eq)(products_1.products.id, productId));
        if (!product || product.status !== 'ACTIVE') {
            const err = new Error('Product is not available for purchase');
            err.statusCode = 400;
            err.name = 'BadRequest';
            throw err;
        }
        // Provider Validation
        let activeProvider = null;
        let activeAdapter = null;
        if (product.providerId) {
            const resolved = await ProviderResolver_1.providerResolver.resolveActive(product.providerId);
            activeProvider = resolved.provider;
            activeAdapter = resolved.adapter;
        }
        // 2. Validate Variants & Determine Authoritative Price
        const existingVariants = await db
            .select()
            .from(product_variants_1.productVariants)
            .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.productId, product.id));
        const hasVariants = existingVariants.length > 0;
        let price;
        let originalPrice = null;
        let cost = 0;
        let variantName;
        if (hasVariants) {
            if (!variantId) {
                const err = new Error('A variant must be selected for this product');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
            const variant = existingVariants.find((v) => v.id === variantId);
            if (!variant) {
                // Check if the variant exists anywhere to distinguish "not found" vs "wrong product"
                const [anyVariant] = await db
                    .select()
                    .from(product_variants_1.productVariants)
                    .where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId));
                if (anyVariant) {
                    const err = new Error('Selected variant does not belong to the requested product');
                    err.statusCode = 400;
                    err.name = 'BadRequest';
                    throw err;
                }
                const err = new Error('Selected variant was not found');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
            if (!variant.isActive) {
                const err = new Error('Selected variant is currently inactive');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
            price = Number(variant.sellingPrice);
            originalPrice = variant.originalPrice ? Number(variant.originalPrice) : null;
            cost = Number(variant.costPrice) || 0;
            variantName = variant.name;
        }
        else {
            // Product has zero variants - backward compatibility legacy flow
            if (variantId) {
                const err = new Error('Selected variant does not belong to the requested product');
                err.statusCode = 400;
                err.name = 'BadRequest';
                throw err;
            }
            price = Number(product.sellingPrice);
            originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
            cost = Number(product.costPrice) || 0;
            variantName = product.name;
        }
        if (isNaN(price) || price < 0) {
            throw new Error('Invalid product price configuration');
        }
        const totalAmount = (price * quantity).toFixed(2);
        // Calculate authoritative discount
        let discountPercent = null;
        if (originalPrice !== null && originalPrice > 0 && originalPrice > price) {
            discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        // Lookup Category Name Snapshot
        let categoryName = '';
        if (product.categoryId) {
            const [cat] = await db
                .select({ name: categories_1.categories.name })
                .from(categories_1.categories)
                .where((0, drizzle_orm_1.eq)(categories_1.categories.id, product.categoryId));
            if (cat) {
                categoryName = cat.name;
            }
        }
        // Idempotency / Reference
        const orderRef = idempotencyKey || `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const result = await (0, client_1.withTransaction)(async (tx) => {
            // 3. Create Order
            const newOrder = {
                userId,
                totalAmount,
                currency: product.currency,
                status: 'PENDING',
                paymentStatus: 'SUCCESSFUL',
                paymentMethod: 'WALLET_VAULT',
                deliveryStatus: 'PENDING',
                reference: orderRef,
            };
            const order = await order_repository_1.orderRepository.createOrder(newOrder, tx);
            // 4. Create Order Item
            const newItem = {
                orderId: order.id,
                productId: product.id,
                providerId: product.providerId,
                providerProductId: product.providerProductId,
                productNameSnapshot: product.name,
                variantNameSnapshot: variantName,
                categorySnapshot: categoryName,
                priceAtPurchase: price.toFixed(2),
                providerCostSnapshot: cost.toFixed(2),
                faceValue: originalPrice ? originalPrice.toFixed(2) : null,
                discountPercent: discountPercent,
                quantity,
                fulfillmentStatus: 'PENDING',
            };
            const orderItem = await order_repository_1.orderRepository.createOrderItem(newItem, tx);
            // 5. Atomic Wallet Debit
            if (Number(totalAmount) > 0) {
                await wallet_service_1.walletService.debitWallet({
                    userId,
                    amount: totalAmount,
                    referenceType: 'order',
                    referenceId: order.id.toString(),
                    description: `Payment for Order #${order.id} - ${product.name} (${variantName})`,
                }, tx);
            }
            return {
                order,
                orderItem,
                totalAmount,
                product,
                provider: activeProvider,
                variantId,
                variantName,
            };
        });
        // 6. Provider Fulfillment (Outside the DB Transaction)
        let finalOrder = result.order;
        let finalItems = [result.orderItem];
        if (result.provider && result.provider.isEnabled) {
            const adapter = ProviderRegistry_1.providerRegistry.getAdapter(result.provider.code);
            if (adapter && adapter.fulfillOrder) {
                try {
                    const fulfillment = await adapter.fulfillOrder({
                        orderReference: result.order.reference,
                        providerProductId: result.product.providerProductId || '',
                        quantity: result.orderItem.quantity,
                    });
                    if (fulfillment.status === 'FAILED') {
                        await this.recoverFailedOrder(result.order, result.totalAmount);
                        finalOrder = await order_repository_1.orderRepository.updateOrder(result.order.id, { status: 'REFUNDED', deliveryStatus: 'FAILED' });
                    }
                    else {
                        finalOrder = await order_repository_1.orderRepository.updateOrder(result.order.id, {
                            status: fulfillment.status === 'ACTIVE' ? 'COMPLETED' : 'PROCESSING',
                            deliveryStatus: fulfillment.status === 'ACTIVE' ? 'DELIVERED' : 'PENDING'
                        });
                    }
                }
                catch (err) {
                    finalOrder = await order_repository_1.orderRepository.updateOrder(result.order.id, { status: 'PROCESSING' });
                }
            }
        }
        return {
            orderId: finalOrder.id,
            id: finalOrder.id,
            userId: finalOrder.userId,
            productId: product.id,
            variantId: result.variantId || undefined,
            variantName: result.variantName,
            amount: Number(finalOrder.totalAmount),
            totalAmount: finalOrder.totalAmount,
            currency: finalOrder.currency,
            status: finalOrder.status,
            deliveryStatus: finalOrder.deliveryStatus,
            paymentStatus: finalOrder.paymentStatus,
            reference: finalOrder.reference,
            createdAt: finalOrder.createdAt,
            items: finalItems.map((item) => ({
                id: item.id,
                productId: item.productId,
                productNameSnapshot: item.productNameSnapshot,
                variantNameSnapshot: item.variantNameSnapshot,
                priceAtPurchase: Number(item.priceAtPurchase),
                faceValue: item.faceValue ? Number(item.faceValue) : null,
                discountPercent: item.discountPercent,
                quantity: item.quantity,
                fulfillmentStatus: item.fulfillmentStatus,
            })),
        };
    }
    /**
     * Safely refunds a failed order.
     * Requires strict idempotency to prevent duplicate refunds.
     */
    async recoverFailedOrder(order, amount, _tx) {
        if (Number(amount) <= 0)
            return;
        await wallet_service_1.walletService.refundWallet({
            userId: order.userId,
            amount: amount,
            referenceType: 'refund',
            referenceId: order.id.toString(),
            idempotencyKey: `REFUND-${order.id}`,
            description: `Refund for failed Order #${order.id}`,
        });
    }
    /**
     * Reconciles a single order, safely acquiring a row lock via a two-stage claim.
     * This prevents blocking the PostgreSQL pool during slow HTTP provider calls.
     */
    async reconcileSingleOrder(orderId) {
        const db = (0, client_1.getDb)();
        const workerClaimId = `claim-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        // 1. Atomically Claim the Order
        const claimResult = await (0, client_1.withTransaction)(async (tx) => {
            // Use FOR UPDATE SKIP LOCKED to prevent other workers from even waiting for this row
            const [lockedOrder] = await tx.select().from(orders_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(orders_1.orders.id, orderId), (0, drizzle_orm_1.inArray)(orders_1.orders.status, ['PENDING', 'PROCESSING'])))
                .for('update', { skipLocked: true });
            if (!lockedOrder)
                return null; // Locked by another worker's claim phase, or status changed.
            let meta = {};
            try {
                meta = JSON.parse(lockedOrder.metadata || '{}');
            }
            catch (e) { }
            const now = Date.now();
            // If claimed in the last 60 seconds, skip (worker claim lease)
            if (meta.reconcileClaimedAt && now - meta.reconcileClaimedAt < 60000) {
                return null;
            }
            if (meta.reconcileClaimedAt && now - meta.reconcileClaimedAt >= 60000) {
                alert_service_1.alertService.raiseAlert({
                    type: 'ORDER_RECONCILIATION_FAILURE',
                    severity: 'MEDIUM',
                    message: `Stale claim detected for Order #${orderId}, re-claiming`,
                    details: { orderId, previousClaimId: meta.reconcileClaimId, claimedAt: meta.reconcileClaimedAt }
                }).catch(console.error);
            }
            meta.reconcileClaimedAt = now;
            meta.reconcileClaimId = workerClaimId;
            const updated = await order_repository_1.orderRepository.updateOrder(orderId, { metadata: JSON.stringify(meta) }, tx);
            let provId = null;
            const items = await order_repository_1.orderRepository.findOrderItemsByOrderId(orderId, tx);
            if (items.length > 0) {
                provId = items[0].providerId;
            }
            return { order: updated, providerId: provId };
        });
        if (!claimResult || !claimResult.order || !claimResult.providerId)
            return;
        const claimedOrder = claimResult.order;
        const originalProviderId = claimResult.providerId;
        // 2. Perform external HTTP Provider Lookup entirely OUTSIDE the DB lock
        const [provider] = await db.select().from(providers_1.providers).where((0, drizzle_orm_1.eq)(providers_1.providers.id, originalProviderId));
        if (!provider)
            return;
        const adapter = ProviderRegistry_1.providerRegistry.getAdapter(provider.code);
        if (!adapter || !adapter.getOrderStatus)
            return;
        let nextStatus = 'PROCESSING';
        let nextDelivery = 'PENDING';
        let shouldRefund = false;
        try {
            const providerStatus = await adapter.getOrderStatus(claimedOrder.reference);
            if (providerStatus.status === 'ACTIVE' || providerStatus.status === 'COMPLETED') {
                nextStatus = 'COMPLETED';
                nextDelivery = 'DELIVERED';
                console.log(`[Reconciliation] Order #${orderId} successfully reconciled to ${nextStatus}`);
            }
            else if (providerStatus.status === 'FAILED' || providerStatus.status === 'TERMINATED') {
                nextStatus = 'REFUNDED';
                nextDelivery = 'FAILED';
                shouldRefund = true;
                alert_service_1.alertService.raiseAlert({
                    type: 'ORDER_RECONCILIATION_FAILURE',
                    severity: 'HIGH',
                    message: `Definitive provider failure for Order #${orderId}, initiating automatic refund`,
                    details: { orderId, providerStatus: providerStatus.status, reference: claimedOrder.reference }
                }).catch(console.error);
            }
        }
        catch (err) {
            console.error(`Reconciliation lookup failed for Order #${orderId}:`, err);
            alert_service_1.alertService.raiseAlert({
                type: 'ORDER_RECONCILIATION_FAILURE',
                severity: 'HIGH',
                message: `Reconciliation error for Order #${orderId}`,
                details: { orderId, error: err.message || 'Unknown error' }
            }).catch(console.error);
        }
        // 3. Finalize State Atomically
        await (0, client_1.withTransaction)(async (tx) => {
            // Re-lock to execute final state and clear claim
            const [finalLock] = await tx.select().from(orders_1.orders).where((0, drizzle_orm_1.eq)(orders_1.orders.id, orderId)).for('update');
            if (!finalLock)
                return;
            let finalMeta = {};
            try {
                finalMeta = JSON.parse(finalLock.metadata || '{}');
            }
            catch (e) { }
            // ENFORCE CLAIM OWNERSHIP
            if (finalMeta.reconcileClaimId !== workerClaimId) {
                console.warn(`[Reconciliation] Worker ${workerClaimId} lost claim for Order #${orderId} - skipped finalization.`);
                return;
            }
            if (shouldRefund) {
                await this.recoverFailedOrder(finalLock, finalLock.totalAmount, tx);
            }
            delete finalMeta.reconcileClaimedAt;
            delete finalMeta.reconcileClaimId;
            await order_repository_1.orderRepository.updateOrder(orderId, {
                status: nextStatus,
                deliveryStatus: nextDelivery,
                metadata: Object.keys(finalMeta).length ? JSON.stringify(finalMeta) : null
            }, tx);
        });
    }
    /**
     * Batch reconciles processing orders.
     */
    async reconcileProcessingOrders(limit = 20) {
        const db = (0, client_1.getDb)();
        const processingOrders = await db
            .select({ id: orders_1.orders.id })
            .from(orders_1.orders)
            .where((0, drizzle_orm_1.inArray)(orders_1.orders.status, ['PENDING', 'PROCESSING']))
            .limit(limit);
        if (processingOrders.length >= limit) {
            alert_service_1.alertService.raiseAlert({
                type: 'ORDER_RECONCILIATION_FAILURE',
                severity: 'LOW',
                message: `High processing backlog detected: ${processingOrders.length} orders pending/processing`,
                details: { count: processingOrders.length, limit }
            }).catch(console.error);
        }
        for (const ord of processingOrders) {
            await this.reconcileSingleOrder(ord.id);
        }
    }
    async getCustomerOrders(userId) {
        const orders = await order_repository_1.orderRepository.findOrdersByUserId(userId);
        const result = [];
        for (const order of orders) {
            const items = await order_repository_1.orderRepository.findOrderItemsByOrderId(order.id);
            const mappedItems = items.map((item) => ({
                id: item.id,
                productNameSnapshot: item.productNameSnapshot,
                product_name_snapshot: item.productNameSnapshot,
                variantNameSnapshot: item.variantNameSnapshot,
                variant_name_snapshot: item.variantNameSnapshot,
                priceAtPurchase: Number(item.priceAtPurchase),
                price_at_purchase: Number(item.priceAtPurchase),
                faceValue: Number(item.faceValue || item.priceAtPurchase),
                face_value: Number(item.faceValue || item.priceAtPurchase),
                discountPercent: item.discountPercent || 0,
                discount_percent: item.discountPercent || 0,
                category: item.categorySnapshot,
                categorySnapshot: item.categorySnapshot,
                fulfillmentStatus: item.fulfillmentStatus,
                fulfillment_status: item.fulfillmentStatus,
                quantity: item.quantity,
                product_key: item.deliveredKey ? { key_value: item.deliveredKey } : undefined,
            }));
            result.push({
                id: order.id,
                userId: order.userId,
                user_id: order.userId,
                totalAmount: Number(order.totalAmount),
                total_amount: Number(order.totalAmount),
                status: order.status,
                paymentStatus: order.paymentStatus,
                payment_status: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                payment_method: order.paymentMethod,
                deliveryStatus: order.deliveryStatus,
                delivery_status: order.deliveryStatus,
                createdAt: order.createdAt.toISOString(),
                created_at: order.createdAt.toISOString(),
                items: mappedItems,
            });
        }
        return result;
    }
}
exports.OrderService = OrderService;
exports.orderService = new OrderService();
