import { FastifyRequest, FastifyReply } from 'fastify';
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
export declare function authenticateReseller(request: FastifyRequest, reply: FastifyReply): Promise<void>;
