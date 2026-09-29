"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateResellerSchema = exports.CreateResellerSchema = void 0;
const zod_1 = require("zod");
exports.CreateResellerSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(1, 'Business name is required'),
    code: zod_1.z.string().min(3, 'Code must be at least 3 characters'),
    ownerEmail: zod_1.z.string().email('Invalid email address'),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']).default('ACTIVE'),
    plan: zod_1.z.string().default('BASIC'),
});
exports.UpdateResellerSchema = zod_1.z.object({
    businessName: zod_1.z.string().optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
    plan: zod_1.z.string().optional(),
    apiAccessEnabled: zod_1.z.boolean().optional(),
});
