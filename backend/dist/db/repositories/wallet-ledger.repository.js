"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletLedgerRepository = exports.WalletLedgerRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const wallet_ledger_1 = require("../schema/wallet-ledger");
class WalletLedgerRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    /**
     * Inserts an immutable ledger entry.
     * Can only be inserted, never updated or deleted.
     */
    async create(data, tx) {
        const executor = tx || this.db;
        const result = await executor
            .insert(wallet_ledger_1.walletLedgerEntries)
            .values(data)
            .returning();
        return result[0];
    }
    /**
     * Finds a ledger entry by idempotency key to prevent double credits/debits.
     */
    async findByIdempotencyKey(key, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(wallet_ledger_1.walletLedgerEntries)
            .where((0, drizzle_orm_1.eq)(wallet_ledger_1.walletLedgerEntries.idempotencyKey, key))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Returns paginated ledger entries ordered by created_at DESC with total count.
     */
    async findByWalletId(walletId, options = {}, tx) {
        const executor = tx || this.db;
        const limit = Math.min(Math.max(options.limit || 20, 1), 100);
        const offset = Math.max(options.offset || 0, 0);
        const [entries, countResult] = await Promise.all([
            executor
                .select()
                .from(wallet_ledger_1.walletLedgerEntries)
                .where((0, drizzle_orm_1.eq)(wallet_ledger_1.walletLedgerEntries.walletId, walletId))
                .orderBy((0, drizzle_orm_1.desc)(wallet_ledger_1.walletLedgerEntries.createdAt))
                .limit(limit)
                .offset(offset),
            executor
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(wallet_ledger_1.walletLedgerEntries)
                .where((0, drizzle_orm_1.eq)(wallet_ledger_1.walletLedgerEntries.walletId, walletId)),
        ]);
        const total = countResult[0]?.count || 0;
        return { entries, total };
    }
    /**
     * Returns all ledger entries for a wallet to support balance reconciliation.
     */
    async findAllByWalletId(walletId, tx) {
        const executor = tx || this.db;
        return executor
            .select()
            .from(wallet_ledger_1.walletLedgerEntries)
            .where((0, drizzle_orm_1.eq)(wallet_ledger_1.walletLedgerEntries.walletId, walletId))
            .orderBy(wallet_ledger_1.walletLedgerEntries.createdAt);
    }
}
exports.WalletLedgerRepository = WalletLedgerRepository;
exports.walletLedgerRepository = new WalletLedgerRepository();
