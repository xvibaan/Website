import { z } from 'zod';

export const amountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid positive monetary number with up to 2 decimal places')
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than zero');

export const ledgerQuerySchema = z.object({
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

export const adminAdjustSchema = z.object({
  userId: z.string().uuid('Invalid user UUID format'),
  amount: amountStringSchema,
  direction: z.enum(['credit', 'debit']),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters long').max(255),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
  currency: z.string().trim().max(10).optional(),
});

export type LedgerQueryParams = z.infer<typeof ledgerQuerySchema>;
export type AdminAdjustInput = z.infer<typeof adminAdjustSchema>;
