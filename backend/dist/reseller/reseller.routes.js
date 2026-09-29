"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerRoutes = void 0;
const reseller_middleware_1 = require("./reseller.middleware");
const client_1 = require("../db/client");
const products_1 = require("../db/schema/products");
const categories_1 = require("../db/schema/categories");
const orders_1 = require("../db/schema/orders");
const product_variants_1 = require("../db/schema/product-variants");
const reseller_wallet_ledger_1 = require("../db/schema/reseller-wallet-ledger");
const drizzle_orm_1 = require("drizzle-orm");
const reseller_wallet_service_1 = require("./reseller.wallet.service");
const money_1 = require("../wallet/money");
const resellerRoutes = async (app) => {
    // Apply Reseller Authentication to all routes in this plugin
    app.addHook('preHandler', reseller_middleware_1.authenticateReseller);
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
        const db = (0, client_1.getDb)();
        // Fetch active categories. If catalogScope is implemented specifically, filter here.
        // Assuming Global Scope for now as per previous phase.
        const allCategories = await db.query.categories.findMany({
            where: (0, drizzle_orm_1.eq)(categories_1.categories.isActive, true),
            orderBy: (0, drizzle_orm_1.desc)(categories_1.categories.createdAt),
        });
        return reply.send({ data: allCategories });
    });
    app.get('/products', async (request, reply) => {
        const db = (0, client_1.getDb)();
        const allProducts = await db.query.products.findMany({
            where: (0, drizzle_orm_1.eq)(products_1.products.status, 'ACTIVE'),
            orderBy: (0, drizzle_orm_1.desc)(products_1.products.createdAt),
        });
        // Enforcement of catalogScope:
        // If reseller.catalogScope has specific allowed product IDs or categories, filter them.
        // For now, returning active products as part of global scope.
        return reply.send({ data: allProducts });
    });
    app.get('/orders', async (request, reply) => {
        const db = (0, client_1.getDb)();
        const resellerId = request.reseller.id;
        const resellerOrders = await db.query.orders.findMany({
            where: (0, drizzle_orm_1.eq)(orders_1.orders.resellerId, resellerId),
            orderBy: (0, drizzle_orm_1.desc)(orders_1.orders.createdAt),
        });
        return reply.send({ data: resellerOrders });
    });
    app.get('/wallet', async (request, reply) => {
        const resellerId = request.reseller.id;
        const wallet = await reseller_wallet_service_1.resellerWalletService.getOrCreateWallet(resellerId);
        return reply.send({ data: wallet });
    });
    app.get('/wallet/ledger', async (request, reply) => {
        const resellerId = request.reseller.id;
        const ledger = await reseller_wallet_service_1.resellerWalletService.getLedger(resellerId);
        return reply.send({ data: ledger });
    });
    app.post('/orders', async (request, reply) => {
        const resellerId = request.reseller.id;
        const { productId, variantId, quantity = 1 } = request.body;
        const db = (0, client_1.getDb)();
        // Verify Active Product
        const [product] = await db.select().from(products_1.products).where((0, drizzle_orm_1.eq)(products_1.products.id, productId)).limit(1);
        if (!product || product.status !== 'ACTIVE') {
            return reply.status(404).send({ error: 'Product not found or inactive' });
        }
        // Verify Active Variant
        const [variant] = await db.select().from(product_variants_1.productVariants).where((0, drizzle_orm_1.eq)(product_variants_1.productVariants.id, variantId)).limit(1);
        if (!variant || !variant.isActive) {
            return reply.status(404).send({ error: 'Variant not found or inactive' });
        }
        // Resolve Wholesale Price
        const basePrice = money_1.Money.format(variant.sellingPrice);
        // Extract global discount or default to 0
        let discountPercentStr = '0';
        if (request.reseller.pricingScope && typeof request.reseller.pricingScope === 'object') {
            discountPercentStr = request.reseller.pricingScope.globalDiscount || '0';
        }
        const discountPercent = Number(discountPercentStr);
        let wholesalePrice = basePrice;
        if (discountPercent > 0) {
            const discountSubunits = (money_1.Money.toSubunits(basePrice) * BigInt(discountPercent)) / 100n;
            wholesalePrice = money_1.Money.fromSubunits(money_1.Money.toSubunits(basePrice) - discountSubunits);
        }
        const totalAmount = money_1.Money.format(money_1.Money.fromSubunits(money_1.Money.toSubunits(wholesalePrice) * BigInt(quantity)));
        try {
            const result = await db.transaction(async (tx) => {
                // Lock and Debit Wallet Atomically
                const { wallet, ledgerEntry } = await reseller_wallet_service_1.resellerWalletService.debitWallet({
                    resellerId,
                    amount: totalAmount,
                    referenceType: 'order',
                    idempotencyKey: `reseller-order-${resellerId}-${Date.now()}-${Math.random()}`,
                    description: `API Order for ${quantity}x ${product.name}`,
                }, tx);
                // Create Order Attribution
                const [order] = await tx.insert(orders_1.orders).values({
                    userId: request.reseller.ownerId,
                    resellerId,
                    totalAmount,
                    currency: 'INR',
                    status: 'PROCESSING',
                    paymentStatus: 'SUCCESSFUL',
                    paymentMethod: 'RESELLER_WALLET',
                }).returning();
                // Create Order Item Snapshots
                const [orderItem] = await tx.insert(orders_1.orderItems).values({
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
                await tx.update(reseller_wallet_ledger_1.resellerWalletLedgerEntries)
                    .set({ referenceId: String(order.id) })
                    .where((0, drizzle_orm_1.eq)(reseller_wallet_ledger_1.resellerWalletLedgerEntries.id, ledgerEntry.id));
                return { order, orderItem, wallet };
            });
            return reply.status(201).send({ data: result });
        }
        catch (err) {
            if (err.message.includes('Insufficient')) {
                return reply.status(422).send({ error: err.message });
            }
            throw err;
        }
    });
};
exports.resellerRoutes = resellerRoutes;
