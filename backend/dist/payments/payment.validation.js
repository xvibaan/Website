"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookParamSchema = exports.paymentIdParamSchema = exports.adminPaymentQuerySchema = exports.paymentHistoryQuerySchema = exports.createPaymentSchema = exports.amountStringSchema = void 0;
const zod_1 = require("zod");
const MONETARY_REGEX = /^\d+(\.\d{1,2})?$/;
exports.amountStringSchema = zod_1.z
    .string()
    .trim()
    .regex(MONETARY_REGEX, 'Amount must be a valid positive monetary number with up to 2 decimal places')
    .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
}, 'Amount must be greater than zero');
exports.createPaymentSchema = zod_1.z.object({
    amount: exports.amountStringSchema,
    currency: zod_1.z
        .string()
        .trim()
        .toUpperCase()
        .min(3, 'Currency code must be at least 3 characters')
        .max(5, 'Currency code must not exceed 5 characters')
        .default('INR')
        .refine((curr) => curr === 'INR' || curr === 'USDT', 'Currently only INR and USDT currencies are supported'),
    purpose: zod_1.z.enum(['WALLET_RECHARGE']).default('WALLET_RECHARGE'),
    gateway: zod_1.z
        .string()
        .trim()
        .min(2, 'Gateway name must be at least 2 characters')
        .max(50, 'Gateway name must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Gateway name contains invalid characters')
        .optional(),
    idempotencyKey: zod_1.z
        .string()
        .trim()
        .min(4, 'Idempotency key must be at least 4 characters')
        .max(255, 'Idempotency key must not exceed 255 characters')
        .optional(),
});
exports.paymentHistoryQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer'),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
});
exports.adminPaymentQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer'),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    status: zod_1.z
        .enum([
        'PENDING',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
    ])
        .optional(),
    userId: zod_1.z.string().uuid('Invalid user UUID format').optional(),
});
exports.paymentIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid payment transaction UUID format'),
});
exports.webhookParamSchema = zod_1.z.object({
    gateway: zod_1.z
        .string()
        .trim()
        .min(2)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/),
});
