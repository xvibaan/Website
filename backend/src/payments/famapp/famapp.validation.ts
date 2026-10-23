import { z } from 'zod';

const MONETARY_REGEX = /^\d+(\.\d{1,2})?$/;
const UTR_REGEX = /^[0-9]{12}$/;

export const utrStringSchema = z
  .string()
  .trim()
  .regex(UTR_REGEX, 'UTR/RRN must be exactly 12 numeric digits');

export const amountStringSchema = z
  .string()
  .trim()
  .regex(MONETARY_REGEX, 'Amount must be a valid positive monetary number with up to 2 decimal places')
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than zero');

export const submitUtrSchema = z.object({
  utr: utrStringSchema,
  amount: amountStringSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .default('INR')
    .refine((c) => c === 'INR', 'Only INR currency is supported for UPI top-ups'),
});

export const adminReviewSubmissionSchema = z
  .object({
    action: z.enum(['APPROVE', 'OVERRIDE_APPROVE', 'REJECT']),
    reason: z.string().trim().max(1000).optional(),
    settlementConfirmed: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'APPROVE' || data.action === 'OVERRIDE_APPROVE') {
        return data.settlementConfirmed === true;
      }
      return true;
    },
    {
      message: 'Explicit settlement confirmation (settlementConfirmed: true) is required to approve payments.',
      path: ['settlementConfirmed'],
    }
  )
  .refine(
    (data) => {
      if (data.action === 'OVERRIDE_APPROVE') {
        return !!data.reason && data.reason.trim().length >= 10;
      }
      return true;
    },
    {
      message: 'Exceptional manual override requires an audit reason of at least 10 characters explaining independent verification.',
      path: ['reason'],
    }
  );

export const querySubmissionsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => !isNaN(v) && v >= 1, 'Page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => !isNaN(v) && v >= 1 && v <= 100, 'Limit must be between 1 and 100'),
  status: z
    .enum(['PENDING', 'MATCHED', 'CREDITED', 'MANUAL_REVIEW', 'EXPIRED', 'REJECTED'])
    .optional(),
  utr: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
});

export const queryEmailEventsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => !isNaN(v) && v >= 1, 'Page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => !isNaN(v) && v >= 1 && v <= 100, 'Limit must be between 1 and 100'),
  status: z
    .enum(['UNCLAIMED', 'CLAIMED', 'FLAGGED', 'EXPIRED', 'UNPARSEABLE'])
    .optional(),
  utr: z.string().trim().optional(),
});
