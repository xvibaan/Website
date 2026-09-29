import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../db/client';
import { domainRoutes, websiteInstances } from '../db/schema/website-instances';
import { eq, and } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      resellerId: string;
      instanceId: string;
      domain: string;
    };
  }
}

export async function tenantResolver(request: FastifyRequest, reply: FastifyReply) {
  // Extract canonical host without port
  const hostHeader = request.headers.host || '';
  const hostname = hostHeader.split(':')[0].toLowerCase();

  // If local direct access to backend, skip tenant resolution (e.g., localhost:4000)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return;
  }

  try {
    const db = getDb();
    const routeInfo = await db
      .select({
        resellerId: websiteInstances.resellerId,
        instanceId: websiteInstances.id,
        instanceStatus: websiteInstances.status,
      })
      .from(domainRoutes)
      .innerJoin(websiteInstances, eq(domainRoutes.instanceId, websiteInstances.id))
      .where(
        and(
          eq(domainRoutes.hostname, hostname),
          eq(domainRoutes.status, 'VERIFIED')
        )
      )
      .limit(1)
      .execute();

    if (routeInfo.length > 0) {
      const info = routeInfo[0];
      
      // Prevent routing if instance is not active
      if (info.instanceStatus !== 'ACTIVE') {
        return reply.status(403).send({ error: 'Website instance is currently inactive or suspended' });
      }

      request.tenant = {
        resellerId: info.resellerId,
        instanceId: info.instanceId,
        domain: hostname,
      };
    } else {
      // Unknown domain routing
      // If we are strictly enforcing tenant routing for external domains, we might reject here.
      // But we will just not attach a tenant, letting the handlers decide.
    }
  } catch (error) {
    request.log.error({ err: error, hostname }, 'Failed to resolve tenant from hostname');
  }
}
