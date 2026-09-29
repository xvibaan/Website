"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .email('Invalid email address')
        .max(255, 'Email is too long')
        .transform((val) => val.toLowerCase()),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password must not exceed 128 characters'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .email('Invalid email address')
        .max(255, 'Email is too long')
        .transform((val) => val.toLowerCase()),
    password: zod_1.z
        .string()
        .min(1, 'Password is required')
        .max(128, 'Password must not exceed 128 characters'),
});
