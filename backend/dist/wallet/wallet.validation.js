"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAdjustSchema = exports.ledgerQuerySchema = exports.amountStringSchema = void 0;
const zod_1 = require("zod");
exports.amountStringSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid positive monetary number with up to 2 decimal places')
    .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
}, 'Amount must be greater than zero');
exports.ledgerQuerySchema = zod_1.z.object({
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
exports.adminAdjustSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user UUID format'),
    amount: exports.amountStringSchema,
    direction: zod_1.z.enum(['credit', 'debit']),
    reason: zod_1.z.string().trim().min(3, 'Reason must be at least 3 characters long').max(255),
    idempotencyKey: zod_1.z.string().trim().min(1).max(255).optional(),
    currency: zod_1.z.string().trim().max(10).optional(),
});
