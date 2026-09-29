import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../db/client';
import { resellers } from '../db/schema/resellers';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    reseller?: {
      id: string;
      code: string;
      businessName: string;
      ownerId: string;
      catalogScope: any;
      pricingScope: any;
    };
  }
}

export async function authenticateReseller(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.substring(7);
  const hash = createHash('sha256').update(token).digest('hex');

  const db = getDb();
  const [reseller] = await db
    .select()
    .from(resellers)
    .where(eq(resellers.apiSecretHash, hash));

  if (!reseller) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid API token',
    });
  }

  if (reseller.status === 'SUSPENDED') {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Reseller account is suspended',
    });
  }

  if (reseller.status === 'DISABLED' || !reseller.apiAccessEnabled) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Reseller API access is disabled',
    });
  }

  request.reseller = {
    id: reseller.id,
    code: reseller.code,
    businessName: reseller.businessName,
    ownerId: reseller.ownerId,
    catalogScope: reseller.catalogScope,
    pricingScope: reseller.pricingScope,
  };
}
