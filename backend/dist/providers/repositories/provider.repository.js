"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRepository = exports.ProviderRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const providers_1 = require("../../db/schema/providers");
class ProviderRepository {
    getDb(tx) {
        return tx || (0, client_1.getDb)();
    }
    /**
     * Converts a database Provider entity into a SafeProvider, ensuring credentials
     * are scrubbed before reaching any API layer or caller.
     */
    toSafeProvider(p) {
        const state = p.isMaintenance ? 'MAINTENANCE' : p.isEnabled ? 'ACTIVE' : 'DISABLED';
        return {
            id: p.id,
            code: p.code,
            name: p.name,
            adapterType: p.adapterType,
            description: p.description,
            isEnabled: p.isEnabled,
            isMaintenance: p.isMaintenance,
            state,
            operationalHealth: p.operationalHealth,
            healthStatus: p.operationalHealth,
            isCredentialsConfigured: Boolean(p.encryptedCredentials),
            priority: p.priority,
            lastHealthCheckAt: p.lastHealthCheckAt,
            lastSuccessfulHealthCheckAt: p.lastSuccessfulHealthCheckAt,
            lastSuccessfulRequestAt: p.lastSuccessfulHealthCheckAt ? p.lastSuccessfulHealthCheckAt.toISOString() : null,
            lastFailedHealthCheckAt: p.lastFailedHealthCheckAt,
            lastErrorAt: p.lastFailedHealthCheckAt ? p.lastFailedHealthCheckAt.toISOString() : null,
            failureCount: p.failureCount,
            lastHealthResponseTimeMs: p.lastHealthResponseTimeMs,
            lastHealthErrorMessage: p.lastHealthErrorMessage,
            lastErrorMessage: p.lastHealthErrorMessage,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        };
    }
    async create(data, tx) {
        const db = this.getDb(tx);
        const [created] = await db
            .insert(providers_1.providers)
            .values({
            ...data,
            code: data.code.toLowerCase().trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return created;
    }
    async findById(id, tx) {
        const db = this.getDb(tx);
        const [found] = await db
            .select()
            .from(providers_1.providers)
            .where((0, drizzle_orm_1.eq)(providers_1.providers.id, id))
            .limit(1);
        return found || null;
    }
    async findByCode(code, tx) {
        const db = this.getDb(tx);
        const [found] = await db
            .select()
            .from(providers_1.providers)
            .where((0, drizzle_orm_1.eq)(providers_1.providers.code, code.toLowerCase().trim()))
            .limit(1);
        return found || null;
    }
    async findAll(filter, tx) {
        const db = this.getDb(tx);
        const conditions = [];
        if (filter?.isEnabled !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(providers_1.providers.isEnabled, filter.isEnabled));
        }
        if (filter?.operationalHealth) {
            conditions.push((0, drizzle_orm_1.eq)(providers_1.providers.operationalHealth, filter.operationalHealth));
        }
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [totalResult] = await db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(providers_1.providers)
            .where(whereClause);
        const total = Number(totalResult?.count || 0);
        const query = db
            .select()
            .from(providers_1.providers)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(providers_1.providers.priority), (0, drizzle_orm_1.desc)(providers_1.providers.createdAt));
        if (filter?.limit) {
            query.limit(filter.limit);
        }
        if (filter?.offset) {
            query.offset(filter.offset);
        }
        const rows = await query;
        return { providers: rows, total };
    }
    async update(id, data, tx) {
        const db = this.getDb(tx);
        const [updated] = await db
            .update(providers_1.providers)
            .set({
            ...data,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(providers_1.providers.id, id))
            .returning();
        return updated || null;
    }
    async updateHealth(id, healthData, tx) {
        const db = this.getDb(tx);
        const updatePayload = {
            operationalHealth: healthData.operationalHealth,
            lastHealthCheckAt: healthData.lastHealthCheckAt,
            lastHealthResponseTimeMs: healthData.lastHealthResponseTimeMs,
            lastHealthErrorMessage: healthData.lastHealthErrorMessage ?? null,
            updatedAt: new Date(),
        };
        if (healthData.lastSuccessfulHealthCheckAt) {
            updatePayload.lastSuccessfulHealthCheckAt = healthData.lastSuccessfulHealthCheckAt;
            updatePayload.failureCount = 0; // Reset counter on success
        }
        if (healthData.lastFailedHealthCheckAt) {
            updatePayload.lastFailedHealthCheckAt = healthData.lastFailedHealthCheckAt;
            if (healthData.failureCount !== undefined) {
                updatePayload.failureCount = healthData.failureCount;
            }
            else {
                updatePayload.failureCount = (0, drizzle_orm_1.sql) `${providers_1.providers.failureCount} + 1`;
            }
        }
        const [updated] = await db
            .update(providers_1.providers)
            .set(updatePayload)
            .where((0, drizzle_orm_1.eq)(providers_1.providers.id, id))
            .returning();
        return updated || null;
    }
    async recordHealthLog(logData, tx) {
        const db = this.getDb(tx);
        const [created] = await db
            .insert(providers_1.providerHealthLogs)
            .values({
            ...logData,
            checkedAt: logData.checkedAt || new Date(),
        })
            .returning();
        return created;
    }
    async getHealthLogs(providerId, limit = 50, tx) {
        const db = this.getDb(tx);
        return db
            .select()
            .from(providers_1.providerHealthLogs)
            .where((0, drizzle_orm_1.eq)(providers_1.providerHealthLogs.providerId, providerId))
            .orderBy((0, drizzle_orm_1.desc)(providers_1.providerHealthLogs.checkedAt))
            .limit(limit);
    }
}
exports.ProviderRepository = ProviderRepository;
exports.providerRepository = new ProviderRepository();
