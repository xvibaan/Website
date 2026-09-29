"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerQuerySchema = exports.providerIdParamSchema = exports.updateProviderStateSchema = exports.createProviderSchema = exports.providerCodeRegex = void 0;
const zod_1 = require("zod");
exports.providerCodeRegex = /^[a-z0-9_-]+$/;
exports.createProviderSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(2, 'Provider code must be at least 2 characters')
        .max(50, 'Provider code cannot exceed 50 characters')
        .regex(exports.providerCodeRegex, 'Provider code must contain only lowercase letters, numbers, hyphens, and underscores'),
    name: zod_1.z
        .string()
        .trim()
        .min(2, 'Provider name must be at least 2 characters')
        .max(100, 'Provider name cannot exceed 100 characters'),
    adapterType: zod_1.z
        .string()
        .trim()
        .min(2, 'Adapter type must be at least 2 characters')
        .max(50, 'Adapter type cannot exceed 50 characters'),
    description: zod_1.z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    isEnabled: zod_1.z.boolean().default(true),
    isMaintenance: zod_1.z.boolean().default(false),
    priority: zod_1.z.number().int().min(0).max(1000).default(0),
});
exports.updateProviderStateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100).optional(),
    description: zod_1.z.string().trim().max(500).optional(),
    isEnabled: zod_1.z.boolean().optional(),
    isMaintenance: zod_1.z.boolean().optional(),
    state: zod_1.z.enum(['ACTIVE', 'DISABLED', 'MAINTENANCE']).optional(),
    reason: zod_1.z.string().trim().max(255).optional(),
    priority: zod_1.z.number().int().min(0).max(1000).optional(),
    encryptedCredentials: zod_1.z.string().optional(),
});
exports.providerIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid provider ID format (must be UUID)'),
});
exports.providerQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default('1')
        .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
    limit: zod_1.z
        .string()
        .optional()
        .default('20')
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
    isEnabled: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => (val === undefined ? undefined : val === 'true')),
    health: zod_1.z.enum(['HEALTHY', 'UNHEALTHY', 'DEGRADED', 'UNKNOWN']).optional(),
});
