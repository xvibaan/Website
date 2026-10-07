import { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../db/client';
import { productProviderOffers } from '../../db/schema/product-provider-offers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const offerParamSchema = z.object({
  id: z.string().uuid(),
});

const offerBodySchema = z.object({
  productId: z.string().uuid(),
  providerId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  providerProductId: z.string().max(255).optional().nullable(),
  providerVariantId: z.string().max(255).optional().nullable(),
  priority: z.number().int().min(1).default(1),
  isEnabled: z.boolean().default(true),
  isMaintenance: z.boolean().default(false),
  costPrice: z.string().max(14).default('0.00'),
  currency: z.string().max(10).default('INR'),
  providerConfiguration: z.string().optional().nullable(),
  fulfillmentCapability: z.string().max(50).default('AUTOMATED'),
});

export const productProviderOffersRoutes: FastifyPluginAsync = async (app) => {
  // GET all offers for a specific product
  app.get('/product/:productId', async (request, reply) => {
    const { productId } = request.params as any;
    const db = getDb();
    const { providers } = await import('../../db/schema/providers');

    // Explicit join to avoid relation schema dependencies and safely omit encryptedCredentials
    const rows = await db.select({
      offer: productProviderOffers,
      providerId: providers.id,
      providerCode: providers.code,
      providerName: providers.name,
      providerAdapterType: providers.adapterType,
      providerIsEnabled: providers.isEnabled,
      providerIsMaintenance: providers.isMaintenance,
      providerOperationalHealth: providers.operationalHealth
    })
    .from(productProviderOffers)
    .innerJoin(providers, eq(providers.id, productProviderOffers.providerId))
    .where(eq(productProviderOffers.productId, productId));

    const offers = rows.map(r => ({
      ...r.offer,
      provider: {
        id: r.providerId,
        code: r.providerCode,
        name: r.providerName,
        adapterType: r.providerAdapterType,
        isEnabled: r.providerIsEnabled,
        isMaintenance: r.providerIsMaintenance,
        operationalHealth: r.providerOperationalHealth
      }
    }));

    return reply.send({ success: true, offers });
  });

  // POST create new offer mapping
  app.post('/', async (request, reply) => {
    const parseResult = offerBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'BadRequest', issues: parseResult.error.flatten().fieldErrors });
    }
    const db = getDb();
    try {
      const [offer] = await db.insert(productProviderOffers).values(parseResult.data).returning();
      return reply.status(201).send({ success: true, offer });
    } catch (err: any) {
      if (err.code === '23505' || err.cause?.code === '23505') {
        return reply.status(409).send({ error: 'Conflict', message: 'A duplicate provider mapping already exists for this product/variant.' });
      }
      throw err;
    }
  });

  // PATCH update offer mapping
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const parseResult = offerBodySchema.partial().safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'BadRequest', issues: parseResult.error.flatten().fieldErrors });
    }
    const db = getDb();
    try {
      const [offer] = await db.update(productProviderOffers).set({ ...parseResult.data, updatedAt: new Date() }).where(eq(productProviderOffers.id, id)).returning();
      if (!offer) return reply.status(404).send({ error: 'NotFound' });
      return reply.send({ success: true, offer });
    } catch (err: any) {
      if (err.code === '23505' || err.cause?.code === '23505') {
        return reply.status(409).send({ error: 'Conflict', message: 'A duplicate provider mapping already exists for this product/variant.' });
      }
      throw err;
    }
  });

  // DELETE offer mapping
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const db = getDb();
    await db.delete(productProviderOffers).where(eq(productProviderOffers.id, id));
    return reply.send({ success: true });
  });
};
