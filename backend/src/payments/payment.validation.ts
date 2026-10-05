import { z } from 'zod';

const MONETARY_REGEX = /^\d+(\.\d{1,2})?$/;

export const amountStringSchema = z
  .string()
  .trim()
  .regex(MONETARY_REGEX, 'Amount must be a valid positive monetary number with up to 2 decimal places')
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than zero');

export const createPaymentSchema = z.object({
  amount: amountStringSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Currency code must be at least 3 characters')
    .max(5, 'Currency code must not exceed 5 characters')
    .default('INR')
    .refine((curr) => curr === 'INR', 'Currently only INR currency is supported'),
  purpose: z.enum(['WALLET_RECHARGE']).default('WALLET_RECHARGE'),
  gateway: z
    .string()
    .trim()
    .min(2, 'Gateway name must be at least 2 characters')
    .max(50, 'Gateway name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Gateway name contains invalid characters')
    .optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(4, 'Idempotency key must be at least 4 characters')
    .max(255, 'Idempotency key must not exceed 255 characters')
    .optional(),
});

export const paymentHistoryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
});

export const adminPaymentQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  status: z
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
  userId: z.string().uuid('Invalid user UUID format').optional(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().uuid('Invalid payment transaction UUID format'),
});

export const webhookParamSchema = z.object({
  gateway: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});
