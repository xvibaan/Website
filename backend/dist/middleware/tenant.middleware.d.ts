import { FastifyRequest, FastifyReply } from 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        tenant?: {
            resellerId: string;
            instanceId: string;
            domain: string;
        };
    }
}
export declare function tenantResolver(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
