import { z } from 'zod';

export const providerCodeRegex = /^[a-z0-9_-]+$/;

export const createProviderSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Provider code must be at least 2 characters')
    .max(50, 'Provider code cannot exceed 50 characters')
    .regex(providerCodeRegex, 'Provider code must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z
    .string()
    .trim()
    .min(2, 'Provider name must be at least 2 characters')
    .max(100, 'Provider name cannot exceed 100 characters'),
  adapterType: z
    .string()
    .trim()
    .min(2, 'Adapter type must be at least 2 characters')
    .max(50, 'Adapter type cannot exceed 50 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  isEnabled: z.boolean().default(true),
  isMaintenance: z.boolean().default(false),
  priority: z.number().int().min(0).max(1000).default(0),
});

export const updateProviderStateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isEnabled: z.boolean().optional(),
  isMaintenance: z.boolean().optional(),
  state: z.enum(['ACTIVE', 'DISABLED', 'MAINTENANCE']).optional(),
  reason: z.string().trim().max(255).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  encryptedCredentials: z.string().optional(),
});

export const providerIdParamSchema = z.object({
  id: z.string().uuid('Invalid provider ID format (must be UUID)'),
});

export const providerQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
  isEnabled: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  health: z.enum(['HEALTHY', 'UNHEALTHY', 'DEGRADED', 'UNKNOWN']).optional(),
});
