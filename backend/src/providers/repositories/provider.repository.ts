import { eq, desc, and, count, sql } from 'drizzle-orm';
import { getDb, DbClient, DbTransaction } from '../../db/client';
import {
  providers,
  Provider,
  NewProvider,
  providerHealthLogs,
  ProviderHealthLog,
  NewProviderHealthLog,
} from '../../db/schema/providers';
import { SafeProvider, ProviderOperationalHealth } from '../types/provider.types';

export class ProviderRepository {
  private getDb(tx?: DbTransaction): DbClient | DbTransaction {
    return tx || getDb();
  }

  /**
   * Converts a database Provider entity into a SafeProvider, ensuring credentials
   * are scrubbed before reaching any API layer or caller.
   */
  public toSafeProvider(p: Provider): SafeProvider {
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
      operationalHealth: p.operationalHealth as ProviderOperationalHealth,
      healthStatus: p.operationalHealth as ProviderOperationalHealth,
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

  async create(data: NewProvider, tx?: DbTransaction): Promise<Provider> {
    const db = this.getDb(tx);
    const [created] = await db
      .insert(providers)
      .values({
        ...data,
        code: data.code.toLowerCase().trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async findById(id: string, tx?: DbTransaction): Promise<Provider | null> {
    const db = this.getDb(tx);
    const [found] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1);
    return found || null;
  }

  async findByCode(code: string, tx?: DbTransaction): Promise<Provider | null> {
    const db = this.getDb(tx);
    const [found] = await db
      .select()
      .from(providers)
      .where(eq(providers.code, code.toLowerCase().trim()))
      .limit(1);
    return found || null;
  }

  async findAll(
    filter?: {
      isEnabled?: boolean;
      operationalHealth?: string;
      limit?: number;
      offset?: number;
    },
    tx?: DbTransaction
  ): Promise<{ providers: Provider[]; total: number }> {
    const db = this.getDb(tx);
    const conditions = [];

    if (filter?.isEnabled !== undefined) {
      conditions.push(eq(providers.isEnabled, filter.isEnabled));
    }
    if (filter?.operationalHealth) {
      conditions.push(eq(providers.operationalHealth, filter.operationalHealth));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(providers)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const query = db
      .select()
      .from(providers)
      .where(whereClause)
      .orderBy(desc(providers.priority), desc(providers.createdAt));

    if (filter?.limit) {
      query.limit(filter.limit);
    }
    if (filter?.offset) {
      query.offset(filter.offset);
    }

    const rows = await query;
    return { providers: rows, total };
  }

  async update(
    id: string,
    data: Partial<NewProvider>,
    tx?: DbTransaction
  ): Promise<Provider | null> {
    const db = this.getDb(tx);
    const [updated] = await db
      .update(providers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, id))
      .returning();
    return updated || null;
  }

  async updateHealth(
    id: string,
    healthData: {
      operationalHealth: ProviderOperationalHealth;
      lastHealthCheckAt: Date;
      lastSuccessfulHealthCheckAt?: Date;
      lastFailedHealthCheckAt?: Date;
      failureCount?: number;
      lastHealthResponseTimeMs?: number;
      lastHealthErrorMessage?: string | null;
    },
    tx?: DbTransaction
  ): Promise<Provider | null> {
    const db = this.getDb(tx);
    const updatePayload: Record<string, any> = {
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
      } else {
        updatePayload.failureCount = sql`${providers.failureCount} + 1`;
      }
    }

    const [updated] = await db
      .update(providers)
      .set(updatePayload)
      .where(eq(providers.id, id))
      .returning();

    return updated || null;
  }

  async recordHealthLog(
    logData: NewProviderHealthLog,
    tx?: DbTransaction
  ): Promise<ProviderHealthLog> {
    const db = this.getDb(tx);
    const [created] = await db
      .insert(providerHealthLogs)
      .values({
        ...logData,
        checkedAt: logData.checkedAt || new Date(),
      })
      .returning();
    return created;
  }

  async getHealthLogs(
    providerId: string,
    limit: number = 50,
    tx?: DbTransaction
  ): Promise<ProviderHealthLog[]> {
    const db = this.getDb(tx);
    return db
      .select()
      .from(providerHealthLogs)
      .where(eq(providerHealthLogs.providerId, providerId))
      .orderBy(desc(providerHealthLogs.checkedAt))
      .limit(limit);
  }
}

export const providerRepository = new ProviderRepository();
