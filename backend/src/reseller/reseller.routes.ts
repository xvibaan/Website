import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticateReseller } from './reseller.middleware';
import { getDb } from '../db/client';
import { products } from '../db/schema/products';
import { categories } from '../db/schema/categories';
import { orders, orderItems } from '../db/schema/orders';
import { productVariants } from '../db/schema/product-variants';
import { resellerWalletLedgerEntries } from '../db/schema/reseller-wallet-ledger';
import { eq, desc, inArray } from 'drizzle-orm';
import { resellerWalletService } from './reseller.wallet.service';
import { Money } from '../wallet/money';

export const resellerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Apply Reseller Authentication to all routes in this plugin
  app.addHook('preHandler', authenticateReseller);

  app.get('/profile', async (request, reply) => {
    return reply.send({
      data: {
        id: request.reseller?.id,
        code: request.reseller?.code,
        businessName: request.reseller?.businessName,
        catalogScope: request.reseller?.catalogScope,
        pricingScope: request.reseller?.pricingScope,
      },
    });
  });

  app.get('/categories', async (request, reply) => {
    const db = getDb();
    // Fetch active categories. If catalogScope is implemented specifically, filter here.
    // Assuming Global Scope for now as per previous phase.
    const allCategories = await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: desc(categories.createdAt),
    });

    return reply.send({ data: allCategories });
  });

  app.get('/products', async (request, reply) => {
    const db = getDb();
    const allProducts = await db.query.products.findMany({
      where: eq(products.status, 'ACTIVE'),
      orderBy: desc(products.createdAt),
    });

    // Enforcement of catalogScope:
    // If reseller.catalogScope has specific allowed product IDs or categories, filter them.
    // For now, returning active products as part of global scope.
    return reply.send({ data: allProducts });
  });

  app.get('/orders', async (request, reply) => {
    const db = getDb();
    const resellerId = request.reseller!.id;

    const resellerOrders = await db.query.orders.findMany({
      where: eq(orders.resellerId, resellerId),
      orderBy: desc(orders.createdAt),
    });

    return reply.send({ data: resellerOrders });
  });

  app.get('/wallet', async (request, reply) => {
    const resellerId = request.reseller!.id;
    const wallet = await resellerWalletService.getOrCreateWallet(resellerId);
    return reply.send({ data: wallet });
  });

  app.get('/wallet/ledger', async (request, reply) => {
    const resellerId = request.reseller!.id;
    const ledger = await resellerWalletService.getLedger(resellerId);
    return reply.send({ data: ledger });
  });

  app.post('/orders', async (request, reply) => {
    const resellerId = request.reseller!.id;
    const { productId, variantId, quantity = 1 } = request.body as any;

    const db = getDb();

    // Verify Active Product
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || product.status !== 'ACTIVE') {
      return reply.status(404).send({ error: 'Product not found or inactive' });
    }

    // Verify Active Variant
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
    if (!variant || !variant.isActive) {
      return reply.status(404).send({ error: 'Variant not found or inactive' });
    }

    // Resolve Wholesale Price
    const basePrice = Money.format(variant.sellingPrice);
    
    // Extract global discount or default to 0
    let discountPercentStr = '0';
    if (request.reseller!.pricingScope && typeof request.reseller!.pricingScope === 'object') {
      discountPercentStr = (request.reseller!.pricingScope as any).globalDiscount || '0';
    }
    const discountPercent = Number(discountPercentStr);
    
    let wholesalePrice = basePrice;
    if (discountPercent > 0) {
      const discountSubunits = (Money.toSubunits(basePrice) * BigInt(discountPercent)) / 100n;
      wholesalePrice = Money.fromSubunits(Money.toSubunits(basePrice) - discountSubunits);
    }
    const totalAmount = Money.format(Money.fromSubunits(Money.toSubunits(wholesalePrice) * BigInt(quantity)));

    try {
      const result = await db.transaction(async (tx) => {
        // Lock and Debit Wallet Atomically
        const { wallet, ledgerEntry } = await resellerWalletService.debitWallet({
          resellerId,
          amount: totalAmount,
          referenceType: 'order',
          idempotencyKey: `reseller-order-${resellerId}-${Date.now()}-${Math.random()}`,
          description: `API Order for ${quantity}x ${product.name}`,
        }, tx);

        // Create Order Attribution
        const [order] = await tx.insert(orders).values({
          userId: request.reseller!.ownerId,
          resellerId,
          totalAmount,
          currency: 'INR',
          status: 'PROCESSING',
          paymentStatus: 'SUCCESSFUL',
          paymentMethod: 'RESELLER_WALLET',
        }).returning();

        // Create Order Item Snapshots
        const [orderItem] = await tx.insert(orderItems).values({
          orderId: order.id,
          productId: product.id,
          providerId: product.providerId,
          providerProductId: product.providerProductId,
          productNameSnapshot: product.name,
          variantNameSnapshot: variant.name,
          priceAtPurchase: wholesalePrice,
          faceValue: basePrice,
          providerCostSnapshot: product.costPrice,
          discountPercent,
          quantity,
          fulfillmentStatus: 'PROCESSING',
        }).returning();

        // Update ledger reference
        await tx.update(resellerWalletLedgerEntries)
          .set({ referenceId: String(order.id) })
          .where(eq(resellerWalletLedgerEntries.id, ledgerEntry.id));

        return { order, orderItem, wallet };
      });

      return reply.status(201).send({ data: result });
    } catch (err: any) {
      if (err.message.includes('Insufficient')) {
        return reply.status(422).send({ error: err.message });
      }
      throw err;
    }
  });
};
