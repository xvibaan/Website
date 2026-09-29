"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 12;
/**
 * Password service for hashing and verifying passwords using bcrypt
 * with work factor / cost of 12.
 * Keeps password logic cleanly separated from database operations.
 */
class PasswordService {
    /**
     * Hashes a plaintext password securely.
     */
    static async hash(plaintext) {
        return bcryptjs_1.default.hash(plaintext, SALT_ROUNDS);
    }
    /**
     * Securely compares a plaintext password against a stored bcrypt hash.
     */
    static async compare(plaintext, hash) {
        return bcryptjs_1.default.compare(plaintext, hash);
    }
}
exports.PasswordService = PasswordService;
