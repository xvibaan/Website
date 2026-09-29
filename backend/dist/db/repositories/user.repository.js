"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const users_1 = require("../schema/users");
/**
 * UserRepository provides centralized data-access operations for the users table.
 * Contains purely data access logic — no password hashing/verification, auth tokens,
 * or business rules.
 */
class UserRepository {
    db;
    constructor(db) {
        this.db = db || (0, client_1.getDb)();
    }
    /**
     * Find a user by their UUID primary key.
     * Can optionally execute within an existing transaction.
     */
    async findById(id, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(users_1.users)
            .where((0, drizzle_orm_1.eq)(users_1.users.id, id))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Find a user by their unique email address.
     * Can optionally execute within an existing transaction.
     */
    async findByEmail(email, tx) {
        const executor = tx || this.db;
        const result = await executor
            .select()
            .from(users_1.users)
            .where((0, drizzle_orm_1.eq)(users_1.users.email, email.toLowerCase().trim()))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Create a new user record.
     * Can optionally execute within an existing transaction.
     */
    async create(data, tx) {
        const executor = tx || this.db;
        const normalizedData = {
            ...data,
            email: data.email.toLowerCase().trim(),
        };
        const result = await executor
            .insert(users_1.users)
            .values(normalizedData)
            .returning();
        return result[0];
    }
}
exports.UserRepository = UserRepository;
/**
 * Export default singleton instance for convenience.
 */
exports.userRepository = new UserRepository();
