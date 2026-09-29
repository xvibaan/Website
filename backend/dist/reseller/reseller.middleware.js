"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateReseller = authenticateReseller;
const client_1 = require("../db/client");
const resellers_1 = require("../db/schema/resellers");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
async function authenticateReseller(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header',
        });
    }
    const token = authHeader.substring(7);
    const hash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    const db = (0, client_1.getDb)();
    const [reseller] = await db
        .select()
        .from(resellers_1.resellers)
        .where((0, drizzle_orm_1.eq)(resellers_1.resellers.apiSecretHash, hash));
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
