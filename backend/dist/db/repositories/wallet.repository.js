"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRepository = exports.WalletRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const wallets_1 = require("../schema/wallets");
class WalletRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    async findById(id, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(wallets_1.wallets)
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.id, id))
            .limit(1);
        return result[0] || null;
    }
    async findByUserId(userId, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(wallets_1.wallets)
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.userId, userId))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Reads the wallet row with a row-level lock (FOR UPDATE) inside a transaction.
     * Prevents race conditions during simultaneous debits/credits.
     */
    async findByUserIdForUpdate(userId, tx) {
        const result = await tx
            .select()
            .from(wallets_1.wallets)
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.userId, userId))
            .for('update')
            .limit(1);
        return result[0] || null;
    }
    /**
     * Reads the wallet row by ID with a row-level lock (FOR UPDATE) inside a transaction.
     */
    async findByIdForUpdate(id, tx) {
        const result = await tx
            .select()
            .from(wallets_1.wallets)
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.id, id))
            .for('update')
            .limit(1);
        return result[0] || null;
    }
    /**
     * Creates a new central wallet for a customer.
     */
    async create(data, tx) {
        const executor = tx || this.db;
        const result = await executor
            .insert(wallets_1.wallets)
            .values(data)
            .returning();
        return result[0];
    }
    /**
     * Updates cached balance within a transaction.
     */
    async updateBalance(id, newBalance, tx) {
        const result = await tx
            .update(wallets_1.wallets)
            .set({
            balance: newBalance,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`,
        })
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.id, id))
            .returning();
        return result[0];
    }
    /**
     * Updates wallet status (active, locked, disabled).
     */
    async updateStatus(id, status, tx) {
        const executor = tx || this.db;
        const result = await executor
            .update(wallets_1.wallets)
            .set({
            status,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`,
        })
            .where((0, drizzle_orm_1.eq)(wallets_1.wallets.id, id))
            .returning();
        return result[0];
    }
}
exports.WalletRepository = WalletRepository;
exports.walletRepository = new WalletRepository();
