import { getDb, withTransaction } from '../db/client';
import { orderRepository } from '../db/repositories/order.repository';
import { walletService } from '../wallet/wallet.service';
import { products } from '../db/schema/products';
import { providers } from '../db/schema/providers';
import { productProviderOffers } from '../db/schema/product-provider-offers';
import { productVariants } from '../db/schema/product-variants';
import { categories } from '../db/schema/categories';
import { orders, Order, NewOrder, NewOrderItem, orderItems } from '../db/schema/orders';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { providerRegistry } from '../providers/registry/ProviderRegistry';
import { providerResolver } from '../providers/services/ProviderResolver';
import { alertService } from '../admin/services/alert.service';

export class OrderService {
  async createOrder(
    userId: string,
    productId: string,
    quantity: number = 1,
    idempotencyKey?: string,
    variantId?: string
  ) {
    const db = getDb();

    // Idempotency Check
    if (idempotencyKey) {
      const existingOrder = await orderRepository.findOrderByReference(idempotencyKey);
      if (existingOrder) {
        if (existingOrder.userId !== userId) {
          const err: any = new Error('Idempotency key reused across different users');
          err.statusCode = 409;
          err.name = 'Conflict';
          throw err;
        }

        const existingItems = await orderRepository.findOrderItemsByOrderId(existingOrder.id);
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
      .from(products)
      .where(eq(products.id, productId));

    if (!product || product.status !== 'ACTIVE') {
      const err: any = new Error('Product is not available for purchase');
      err.statusCode = 400;
      err.name = 'BadRequest';
      throw err;
    }

    const eligibleOffers = await this.getEligibleProviders(product.id, product, variantId);
    if (eligibleOffers.length === 0) {
      const err: any = new Error('No eligible providers currently available for this product');
      err.statusCode = 503;
      err.name = 'ServiceUnavailable';
      throw err;
    }

    // We start the transaction with the primary (first) offer
    let activeOffer = eligibleOffers[0].offer;
    let activeProvider = eligibleOffers[0].provider as any;

    // 2. Validate Variants & Determine Authoritative Price
    const existingVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product.id));

    const hasVariants = existingVariants.length > 0;

    let price: number;
    let originalPrice: number | null = null;
    let cost: number = 0;
    let variantName: string;

    if (hasVariants) {
      if (!variantId) {
        const err: any = new Error('A variant must be selected for this product');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      const variant = existingVariants.find((v) => v.id === variantId);
      if (!variant) {
        // Check if the variant exists anywhere to distinguish "not found" vs "wrong product"
        const [anyVariant] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, variantId));

        if (anyVariant) {
          const err: any = new Error('Selected variant does not belong to the requested product');
          err.statusCode = 400;
          err.name = 'BadRequest';
          throw err;
        }

        const err: any = new Error('Selected variant was not found');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      if (!variant.isActive) {
        const err: any = new Error('Selected variant is currently inactive');
        err.statusCode = 400;
        err.name = 'BadRequest';
        throw err;
      }

      price = Number(variant.sellingPrice);
      originalPrice = variant.originalPrice ? Number(variant.originalPrice) : null;
      cost = Number(variant.costPrice) || 0;
      variantName = variant.name;
    } else {
      // Product has zero variants - backward compatibility legacy flow
      if (variantId) {
        const err: any = new Error('Selected variant does not belong to the requested product');
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
    let discountPercent: number | null = null;
    if (originalPrice !== null && originalPrice > 0 && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    // Lookup Category Name Snapshot
    let categoryName = '';
    if (product.categoryId) {
      const [cat] = await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, product.categoryId));
      if (cat) {
        categoryName = cat.name;
      }
    }

    // Idempotency / Reference
    const orderRef = idempotencyKey || `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const result = await withTransaction(async (tx) => {
      // 3. Create Order
      const newOrder: NewOrder = {
        userId,
        totalAmount,
        currency: product.currency,
        status: 'PENDING',
        paymentStatus: 'SUCCESSFUL',
        paymentMethod: 'WALLET_VAULT',
        deliveryStatus: 'PENDING',
        reference: orderRef,
      };

      const order = await orderRepository.createOrder(newOrder, tx);

      // 4. Create Order Item
      const newItem: NewOrderItem = {
        orderId: order.id,
        productId: product.id,
        variantId: variantId || null,
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

      const orderItem = await orderRepository.createOrderItem(newItem, tx);

      // 5. Atomic Wallet Debit
      if (Number(totalAmount) > 0) {
        await walletService.debitWallet(
          {
            userId,
            amount: totalAmount,
            referenceType: 'order',
            referenceId: order.id.toString(),
            description: `Payment for Order #${order.id} - ${product.name} (${variantName})`,
          },
          tx
        );
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

    // 6. Provider Fulfillment Failover Loop (Outside the DB Transaction)
    let finalOrder = result.order;
    let finalItem = result.orderItem;
    let fulfillmentSuccess = false;
    let isAmbiguous = false;
    let finalProviderId: string | null = null;

    for (const { offer, provider } of eligibleOffers) {
      // Update orderItem in DB if attempting a fallback provider
      if (provider.id !== finalItem.providerId) {
        const costToRecord = offer.costPrice || product.costPrice || '0.00';
        [finalItem] = await db.update(orderItems)
          .set({
            providerId: provider.id,
            providerProductId: offer.providerProductId || product.providerProductId,
            providerCostSnapshot: costToRecord
          })
          .where(eq(orderItems.id, finalItem.id))
          .returning();
      }

      const adapter = providerRegistry.getAdapter(provider.code);
      if (!adapter || !adapter.fulfillOrder) {
        continue;
      }

      let fulfillment: any = null;
      try {
        fulfillment = await adapter.fulfillOrder({
          orderReference: result.order.reference!,
          providerProductId: offer.providerProductId || product.providerProductId || '',
          providerVariantId: offer.providerVariantId || null,
          quantity: finalItem.quantity,
        });
      } catch (err: any) {
        console.warn(`[Failover] Provider ${provider.code} threw error for Order #${result.order.id}. Assuming AMBIGUOUS to prevent double-fulfillment. Error:`, err.message);
        fulfillment = {
          status: 'AMBIGUOUS',
          message: err.message
        };
      }

      if (fulfillment.status === 'AMBIGUOUS') {
        fulfillmentSuccess = false;
        isAmbiguous = true;
        finalOrder = await orderRepository.updateOrder(result.order.id, {
          status: 'PROCESSING',
          deliveryStatus: 'PENDING'
        });
        await db.update(orderItems).set({ fulfillmentStatus: 'PENDING_PROVIDER_VERIFICATION' }).where(eq(orderItems.id, finalItem.id));
        finalProviderId = provider.id;
        break; // Stop loop, do not attempt next provider on ambiguous state
      } else if (fulfillment.status !== 'FAILED') {
        fulfillmentSuccess = true;
        finalOrder = await orderRepository.updateOrder(result.order.id, {
          status: fulfillment.status === 'ACTIVE' ? 'COMPLETED' : 'PROCESSING',
          deliveryStatus: fulfillment.status === 'ACTIVE' ? 'DELIVERED' : 'PENDING'
        });
        finalProviderId = provider.id;
        break; // Stop loop, we succeeded
      }
    }

    if (!fulfillmentSuccess && !isAmbiguous) {
      // All eligible providers definitely failed
      console.error(`[Failover] All eligible providers definitely failed for Order #${result.order.id}. Initiating refund.`);
      await this.recoverFailedOrder(result.order, result.totalAmount);
      finalOrder = await orderRepository.updateOrder(result.order.id, { status: 'REFUNDED', deliveryStatus: 'FAILED' });
      await db.update(orderItems).set({ fulfillmentStatus: 'FAILED' }).where(eq(orderItems.id, finalItem.id));
    }

    const finalItems = [finalItem];

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
  private async recoverFailedOrder(order: NewOrder & { id: number }, amount: string, _tx?: any) {
    if (Number(amount) <= 0) return;

    await walletService.refundWallet({
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
  async reconcileSingleOrder(orderId: number) {
    const db = getDb();

    const workerClaimId = `claim-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // 1. Atomically Claim the Order
    const claimResult = await withTransaction(async (tx) => {
      // Use FOR UPDATE SKIP LOCKED to prevent other workers from even waiting for this row
      const [lockedOrder] = await tx.select().from(orders)
        .where(and(eq(orders.id, orderId), inArray(orders.status, ['PENDING', 'PROCESSING'])))
        .for('update', { skipLocked: true });

      if (!lockedOrder) return null; // Locked by another worker's claim phase, or status changed.

      let meta: any = {};
      try { meta = JSON.parse(lockedOrder.metadata || '{}'); } catch(e) {}

      const now = Date.now();
      // If claimed in the last 60 seconds, skip (worker claim lease)
      if (meta.reconcileClaimedAt && now - meta.reconcileClaimedAt < 60000) {
        return null;
      }

      if (meta.reconcileClaimedAt && now - meta.reconcileClaimedAt >= 60000) {
        alertService.raiseAlert({
          type: 'ORDER_RECONCILIATION_FAILURE',
          severity: 'MEDIUM',
          message: `Stale claim detected for Order #${orderId}, re-claiming`,
          details: { orderId, previousClaimId: meta.reconcileClaimId, claimedAt: meta.reconcileClaimedAt }
        }).catch(console.error);
      }

      meta.reconcileClaimedAt = now;
      meta.reconcileClaimId = workerClaimId;
      const updated = await orderRepository.updateOrder(orderId, { metadata: JSON.stringify(meta) }, tx);

      let provId: string | null = null;
      const items = await orderRepository.findOrderItemsByOrderId(orderId, tx);
      if (items.length > 0) {
        provId = items[0].providerId;
      }

      return { order: updated, providerId: provId };
    });

    if (!claimResult || !claimResult.order || !claimResult.providerId) return;

    const claimedOrder = claimResult.order;
    const originalProviderId = claimResult.providerId;

    // 2. Perform external HTTP Provider Lookup entirely OUTSIDE the DB lock
    const [provider] = await db.select().from(providers).where(eq(providers.id, originalProviderId));
    if (!provider) return;

    const adapter = providerRegistry.getAdapter(provider.code);
    if (!adapter || !adapter.getOrderStatus) return;

    let nextStatus: any = 'PROCESSING';
    let nextDelivery = 'PENDING';
    let shouldFallback = false;

    try {
      const providerStatus = adapter.reconcileFulfillment
        ? await adapter.reconcileFulfillment(claimedOrder.reference!)
        : await adapter.getOrderStatus(claimedOrder.reference!);

      if (providerStatus.status === 'ACTIVE' || providerStatus.status === 'COMPLETED' as any) {
        nextStatus = 'COMPLETED';
        nextDelivery = 'DELIVERED';
        console.log(`[Reconciliation] Order #${orderId} successfully reconciled to ${nextStatus}`);
      } else if (providerStatus.status === 'FAILED' || providerStatus.status === 'TERMINATED') {
        shouldFallback = true;

        alertService.raiseAlert({
          type: 'ORDER_RECONCILIATION_FAILURE',
          severity: 'HIGH',
          message: `Definitive provider failure for Order #${orderId}, attempting fallback`,
          details: { orderId, providerStatus: providerStatus.status, reference: claimedOrder.reference }
        }).catch(console.error);
      }
    } catch (err: any) {
      console.error(`Reconciliation lookup failed for Order #${orderId}:`, err);
      alertService.raiseAlert({
        type: 'ORDER_RECONCILIATION_FAILURE',
        severity: 'HIGH',
        message: `Reconciliation error for Order #${orderId}`,
        details: { orderId, error: err.message || 'Unknown error' }
      }).catch(console.error);
    }

    // 3. Finalize State Atomically
    await withTransaction(async (tx) => {
      // Re-lock to execute final state and clear claim
      const [finalLock] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
      if (!finalLock) return;

      let finalMeta: any = {};
      try { finalMeta = JSON.parse(finalLock.metadata || '{}'); } catch(e) {}

      // ENFORCE CLAIM OWNERSHIP
      if (finalMeta.reconcileClaimId !== workerClaimId) {
        console.warn(`[Reconciliation] Worker ${workerClaimId} lost claim for Order #${orderId} - skipped finalization.`);
        return;
      }

      delete finalMeta.reconcileClaimedAt;
      delete finalMeta.reconcileClaimId;

      if (shouldFallback) {
        await orderRepository.updateOrder(orderId, {
          metadata: Object.keys(finalMeta).length ? JSON.stringify(finalMeta) : null
        }, tx);
      } else {
        await orderRepository.updateOrder(orderId, {
          status: nextStatus,
          deliveryStatus: nextDelivery,
          metadata: Object.keys(finalMeta).length ? JSON.stringify(finalMeta) : null
        }, tx);
      }
    });

    if (shouldFallback) {
      await this.attemptFallback(orderId, originalProviderId);
    }
  }

  /**
   * Attempts to resume failover for an order after an ambiguous outcome resolved to definitive failure.
   */
  async attemptFallback(orderId: number, failedProviderId: string) {
    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.status !== 'PROCESSING') return;

    const items = await orderRepository.findOrderItemsByOrderId(orderId);
    if (!items.length) return;
    const finalItem = items[0];
    if (!finalItem.productId) return;

    const [product] = await db.select().from(products).where(eq(products.id, finalItem.productId));
    if (!product) return;

    const variantId = finalItem.variantId || undefined;

    const eligibleOffers = await this.getEligibleProviders(product.id, undefined, variantId);

    // Find where the failed provider was in the sequence
    const failedIndex = eligibleOffers.findIndex(o => o.provider.id === failedProviderId);
    const remainingOffers = failedIndex >= 0 ? eligibleOffers.slice(failedIndex + 1) : [];

    let fulfillmentSuccess = false;
    let isAmbiguous = false;

    for (const { offer, provider } of remainingOffers) {
      // Create new items for fallbacks if needed, or reuse
      await db.update(orderItems).set({
        providerId: provider.id,
        providerProductId: offer.providerProductId || product.providerProductId,
        providerCostSnapshot: offer.costPrice || product.costPrice || '0.00'
      }).where(eq(orderItems.id, finalItem.id));

      const adapter = providerRegistry.getAdapter(provider.code);
      if (!adapter || !adapter.fulfillOrder) continue;

      let fulfillment: any = null;
      try {
        fulfillment = await adapter.fulfillOrder({
          orderReference: order.reference!,
          providerProductId: offer.providerProductId || product.providerProductId || '',
          providerVariantId: offer.providerVariantId || null,
          quantity: finalItem.quantity,
        });
      } catch (err: any) {
        console.warn(`[Failover-Fallback] Provider ${provider.code} threw error for Order #${orderId}. Assuming AMBIGUOUS. Error:`, err.message);
        fulfillment = { status: 'AMBIGUOUS', message: err.message };
      }

      if (fulfillment.status === 'AMBIGUOUS') {
        fulfillmentSuccess = false;
        isAmbiguous = true;
        await db.update(orderItems).set({ fulfillmentStatus: 'PENDING_PROVIDER_VERIFICATION' }).where(eq(orderItems.id, finalItem.id));
        break; // Stop loop, do not attempt next provider on ambiguous state
      } else if (fulfillment.status !== 'FAILED') {
        fulfillmentSuccess = true;
        await orderRepository.updateOrder(orderId, {
          status: fulfillment.status === 'ACTIVE' ? 'COMPLETED' : 'PROCESSING',
          deliveryStatus: fulfillment.status === 'ACTIVE' ? 'DELIVERED' : 'PENDING'
        });
        await db.update(orderItems).set({ fulfillmentStatus: 'DELIVERED' }).where(eq(orderItems.id, finalItem.id));
        break; // Stop loop, we succeeded
      }
    }

    if (!fulfillmentSuccess && !isAmbiguous) {
      console.error(`[Failover-Fallback] All remaining eligible providers definitively failed for Order #${orderId}. Initiating refund.`);
      await this.recoverFailedOrder(order as any, order.totalAmount);
      await orderRepository.updateOrder(orderId, { status: 'REFUNDED', deliveryStatus: 'FAILED' });
      await db.update(orderItems).set({ fulfillmentStatus: 'FAILED' }).where(eq(orderItems.id, finalItem.id));
    }
  }

  /**
   * Batch reconciles processing orders.
   */
  async reconcileProcessingOrders(limit: number = 20) {
    const db = getDb();
    const processingOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.status, ['PENDING', 'PROCESSING']))
      .limit(limit);

    if (processingOrders.length >= limit) {
      alertService.raiseAlert({
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

  async getCustomerOrders(userId: string) {
    const orders = await orderRepository.findOrdersByUserId(userId);
    const result = [];

    for (const order of orders) {
      const items = await orderRepository.findOrderItemsByOrderId(order.id);

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

  async getEligibleProviders(productId: string, productContext?: any, requestedVariantId?: string) {
    const db = getDb();
    let eligibleOffers: any[] = [];

    // A. Variant-specific offers
    if (requestedVariantId) {
      eligibleOffers = await db.select({
        offer: productProviderOffers,
        provider: providers,
      })
      .from(productProviderOffers)
      .innerJoin(providers, eq(providers.id, productProviderOffers.providerId))
      .where(and(
        eq(productProviderOffers.productId, productId),
        eq(productProviderOffers.variantId, requestedVariantId),
        eq(productProviderOffers.isEnabled, true),
        eq(productProviderOffers.isMaintenance, false),
        eq(providers.isEnabled, true),
        eq(providers.isMaintenance, false)
      ))
      .orderBy(asc(productProviderOffers.priority));
    }

    // B. Fallback to product-level offers (variant_id IS NULL)
    if (eligibleOffers.length === 0) {
      const { isNull } = await import('drizzle-orm');
      eligibleOffers = await db.select({
        offer: productProviderOffers,
        provider: providers,
      })
      .from(productProviderOffers)
      .innerJoin(providers, eq(providers.id, productProviderOffers.providerId))
      .where(and(
        eq(productProviderOffers.productId, productId),
        isNull(productProviderOffers.variantId),
        eq(productProviderOffers.isEnabled, true),
        eq(productProviderOffers.isMaintenance, false),
        eq(providers.isEnabled, true),
        eq(providers.isMaintenance, false)
      ))
      .orderBy(asc(productProviderOffers.priority));
    }

    // E. Legacy fallback to products.provider_id
    if (eligibleOffers.length === 0 && productContext && productContext.providerId) {
      const resolved = await providerResolver.resolveActive(productContext.providerId).catch(() => null);
      if (resolved && resolved.provider.isEnabled && !resolved.provider.isMaintenance) {
        eligibleOffers = [{
          provider: resolved.provider as any,
          offer: {
            providerProductId: productContext.providerProductId,
            providerVariantId: null,
            costPrice: productContext.costPrice || '0.00',
            currency: productContext.currency || 'INR',
          } as any
        }];
      }
    }

    // D. Ensure no duplicate providers in the sequence
    const uniqueProviders = new Set<string>();
    const deduplicatedOffers = [];
    for (const item of eligibleOffers) {
      if (!uniqueProviders.has(item.provider.id)) {
        uniqueProviders.add(item.provider.id);
        deduplicatedOffers.push(item);
      }
    }

    return deduplicatedOffers;
  }
}

export const orderService = new OrderService();
