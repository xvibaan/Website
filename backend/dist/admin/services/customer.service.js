"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAdminService = exports.CustomerAdminService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const users_1 = require("../../db/schema/users");
const wallets_1 = require("../../db/schema/wallets");
const audit_service_1 = require("./audit.service");
class CustomerAdminService {
    async getCustomers(query) {
        const db = (0, client_1.getDb)();
        const conditions = [];
        if (query.role) {
            conditions.push((0, drizzle_orm_1.eq)(users_1.users.role, query.role));
        }
        if (query.isActive !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(users_1.users.isActive, query.isActive));
        }
        if (query.search) {
            conditions.push((0, drizzle_orm_1.ilike)(users_1.users.email, `%${query.search.trim()}%`));
        }
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalRes] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(users_1.users)
            .where(whereClause);
        const total = Number(totalRes?.count || 0);
        const offset = (query.page - 1) * query.limit;
        const rows = await db
            .select({
            user: users_1.users,
            wallet: wallets_1.wallets,
        })
            .from(users_1.users)
            .leftJoin(wallets_1.wallets, (0, drizzle_orm_1.eq)(users_1.users.id, wallets_1.wallets.userId))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(users_1.users.createdAt))
            .limit(query.limit)
            .offset(offset);
        const customers = rows.map((r) => ({
            id: r.user.id,
            email: r.user.email,
            role: r.user.role,
            isActive: r.user.isActive,
            createdAt: r.user.createdAt,
            updatedAt: r.user.updatedAt,
            wallet: r.wallet
                ? {
                    id: r.wallet.id,
                    balance: r.wallet.balance,
                    currency: r.wallet.currency,
                    status: r.wallet.status,
                }
                : null,
        }));
        return { customers, total };
    }
    async getCustomerById(id) {
        const db = (0, client_1.getDb)();
        const rows = await db
            .select({
            user: users_1.users,
            wallet: wallets_1.wallets,
        })
            .from(users_1.users)
            .leftJoin(wallets_1.wallets, (0, drizzle_orm_1.eq)(users_1.users.id, wallets_1.wallets.userId))
            .where((0, drizzle_orm_1.eq)(users_1.users.id, id))
            .limit(1);
        if (rows.length === 0)
            return null;
        const r = rows[0];
        return {
            id: r.user.id,
            email: r.user.email,
            role: r.user.role,
            isActive: r.user.isActive,
            createdAt: r.user.createdAt,
            updatedAt: r.user.updatedAt,
            wallet: r.wallet
                ? {
                    id: r.wallet.id,
                    balance: r.wallet.balance,
                    currency: r.wallet.currency,
                    status: r.wallet.status,
                }
                : null,
        };
    }
    async updateCustomerStatus(id, isActive, reason, adminUserId) {
        return (0, client_1.withTransaction)(async (tx) => {
            const [existing] = await tx
                .select()
                .from(users_1.users)
                .where((0, drizzle_orm_1.eq)(users_1.users.id, id))
                .limit(1);
            if (!existing)
                return null;
            const [updated] = await tx
                .update(users_1.users)
                .set({
                isActive,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(users_1.users.id, id))
                .returning();
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'CUSTOMER_STATUS_UPDATE',
                entityType: 'USER',
                entityId: id,
                details: {
                    previousActive: existing.isActive,
                    newActive: isActive,
                    reason: reason || null,
                },
            }, tx);
            const [wallet] = await tx
                .select()
                .from(wallets_1.wallets)
                .where((0, drizzle_orm_1.eq)(wallets_1.wallets.userId, id))
                .limit(1);
            return {
                id: updated.id,
                email: updated.email,
                role: updated.role,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
                wallet: wallet
                    ? {
                        id: wallet.id,
                        balance: wallet.balance,
                        currency: wallet.currency,
                        status: wallet.status,
                    }
                    : null,
            };
        });
    }
}
exports.CustomerAdminService = CustomerAdminService;
exports.customerAdminService = new CustomerAdminService();
