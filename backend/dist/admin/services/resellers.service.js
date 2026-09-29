"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerService = exports.ResellerService = void 0;
const client_1 = require("../../db/client");
const resellers_1 = require("../../db/schema/resellers");
const users_1 = require("../../db/schema/users");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class ResellerService {
    async listResellers() {
        const db = (0, client_1.getDb)();
        return await db.select({
            id: resellers_1.resellers.id,
            code: resellers_1.resellers.code,
            businessName: resellers_1.resellers.businessName,
            contactEmail: resellers_1.resellers.contactEmail,
            status: resellers_1.resellers.status,
            plan: resellers_1.resellers.plan,
            apiAccessEnabled: resellers_1.resellers.apiAccessEnabled,
            createdAt: resellers_1.resellers.createdAt,
            owner: {
                id: users_1.users.id,
                email: users_1.users.email,
            }
        })
            .from(resellers_1.resellers)
            .innerJoin(users_1.users, (0, drizzle_orm_1.eq)(resellers_1.resellers.ownerId, users_1.users.id))
            .orderBy(resellers_1.resellers.businessName);
    }
    async getReseller(id) {
        const db = (0, client_1.getDb)();
        const records = await db.select({
            id: resellers_1.resellers.id,
            code: resellers_1.resellers.code,
            businessName: resellers_1.resellers.businessName,
            contactEmail: resellers_1.resellers.contactEmail,
            status: resellers_1.resellers.status,
            plan: resellers_1.resellers.plan,
            apiAccessEnabled: resellers_1.resellers.apiAccessEnabled,
            catalogScope: resellers_1.resellers.catalogScope,
            pricingScope: resellers_1.resellers.pricingScope,
            createdAt: resellers_1.resellers.createdAt,
            owner: {
                id: users_1.users.id,
                email: users_1.users.email,
            }
        })
            .from(resellers_1.resellers)
            .innerJoin(users_1.users, (0, drizzle_orm_1.eq)(resellers_1.resellers.ownerId, users_1.users.id))
            .where((0, drizzle_orm_1.eq)(resellers_1.resellers.id, id));
        return records[0] || null;
    }
    async createReseller(data) {
        const db = (0, client_1.getDb)();
        // 1. Find or create owner user
        let user = await db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(users_1.users.email, data.ownerEmail),
        });
        if (!user) {
            const randomPassword = (0, crypto_1.randomBytes)(16).toString('hex');
            const passwordHash = await bcryptjs_1.default.hash(randomPassword, 10);
            const insertResult = await db.insert(users_1.users).values({
                email: data.ownerEmail,
                passwordHash,
                role: 'customer', // Or custom role if available
            }).returning();
            user = insertResult[0];
        }
        // 2. Check duplicate code
        const existing = await db.query.resellers.findFirst({
            where: (0, drizzle_orm_1.eq)(resellers_1.resellers.code, data.code),
        });
        if (existing) {
            throw new Error('RESELLER_CODE_IN_USE');
        }
        const inserted = await db.insert(resellers_1.resellers).values({
            businessName: data.businessName,
            code: data.code,
            ownerId: user.id,
            contactEmail: data.ownerEmail,
            status: data.status,
            plan: data.plan,
        }).returning();
        return inserted[0];
    }
    async updateReseller(id, data) {
        const db = (0, client_1.getDb)();
        const updated = await db.update(resellers_1.resellers)
            .set(data)
            .where((0, drizzle_orm_1.eq)(resellers_1.resellers.id, id))
            .returning();
        return updated[0];
    }
    async generateApiToken(id) {
        const secret = (0, crypto_1.randomBytes)(32).toString('hex');
        const hash = (0, crypto_1.createHash)('sha256').update(secret).digest('hex');
        const db = (0, client_1.getDb)();
        await db.update(resellers_1.resellers)
            .set({
            apiSecretHash: hash,
            apiAccessEnabled: true,
        })
            .where((0, drizzle_orm_1.eq)(resellers_1.resellers.id, id));
        return { secret };
    }
    async revokeApiToken(id) {
        const db = (0, client_1.getDb)();
        await db.update(resellers_1.resellers)
            .set({
            apiSecretHash: null,
            apiAccessEnabled: false,
        })
            .where((0, drizzle_orm_1.eq)(resellers_1.resellers.id, id));
    }
}
exports.ResellerService = ResellerService;
exports.resellerService = new ResellerService();
