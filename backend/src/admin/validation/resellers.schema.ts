import { z } from 'zod';

export const CreateResellerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  code: z.string().min(3, 'Code must be at least 3 characters'),
  ownerEmail: z.string().email('Invalid email address'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']).default('ACTIVE'),
  plan: z.string().default('BASIC'),
});

export const UpdateResellerSchema = z.object({
  businessName: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
  plan: z.string().optional(),
  apiAccessEnabled: z.boolean().optional(),
});
