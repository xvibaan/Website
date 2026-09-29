import { z } from 'zod';

// Standard 2-decimal monetary regex
const moneyRegex = /^\d+(\.\d{1,2})?$/;

export const paginationQuerySchema = z.object({
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
});

export const timeRangeEnum = z.enum([
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_YEAR',
  'ALL_TIME',
  'CUSTOM',
]);

export const analyticsFilterSchema = z.object({
  timeRange: timeRangeEnum.optional().default('LAST_30_DAYS'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  providerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const customerQuerySchema = z.object({
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
  search: z.string().trim().optional(),
  role: z.enum(['customer', 'admin']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer ID format (must be UUID)'),
});

export const updateCustomerStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(300).optional(),
});

export const categoryQuerySchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(50).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategoryStatusSchema = z.object({
  isActive: z.boolean(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID format (must be UUID)'),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  categoryId: z.string().uuid('Invalid categoryId UUID').optional().nullable(),
  providerId: z.string().uuid('Invalid providerId UUID').optional().nullable(),
  providerProductId: z.string().trim().max(100).optional().nullable(),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  originalPrice: z
    .string()
    .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
    .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
    .optional()
    .nullable(),
  sellingPrice: z
    .string()
    .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
    .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
  costPrice: z
    .string()
    .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
    .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
    .optional()
    .default('0.00'),
  currency: z.string().trim().min(3).max(10).default('INR'),
  status: z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).default('ACTIVE'),
  specs: z
    .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }),
  sortOrder: z.number().int().default(0),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .optional(),
  categoryId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  providerProductId: z.string().trim().max(100).optional().nullable(),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  originalPrice: z
    .string()
    .regex(moneyRegex, 'Original price must be a valid 2-decimal amount')
    .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
    .optional()
    .nullable(),
  sellingPrice: z
    .string()
    .regex(moneyRegex, 'Selling price must be a valid 2-decimal amount')
    .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative')
    .optional(),
  costPrice: z
    .string()
    .regex(moneyRegex, 'Cost price must be a valid 2-decimal amount')
    .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
    .optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
  specs: z
    .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }),
  sortOrder: z.number().int().optional(),
});

export const updateProductStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']),
});

export const createVariantSchema = z
  .object({
    name: z.string().trim().min(1, 'Variant name is required').max(100),
    duration: z.string().trim().max(50).default('Lifetime'),
    originalPrice: z
      .string()
      .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
      .optional()
      .nullable(),
    sellingPrice: z
      .string()
      .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
    costPrice: z
      .string()
      .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
      .optional()
      .default('0.00'),
    specs: z
      .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }),
    availableStock: z.number().int().min(0, 'Available stock cannot be negative').optional(),
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .transform((data) => ({
    ...data,
    availableStock: data.availableStock ?? data.stock ?? 999,
  }));

export const updateVariantSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    duration: z.string().trim().max(50).optional(),
    originalPrice: z
      .string()
      .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
      .optional()
      .nullable(),
    sellingPrice: z
      .string()
      .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative')
      .optional(),
    costPrice: z
      .string()
      .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
      .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
      .optional(),
    specs: z
      .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }),
    availableStock: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .transform((data) => ({
    ...data,
    availableStock: data.availableStock ?? data.stock,
  }));

export const updateVariantStatusSchema = z.object({
  isActive: z.boolean(),
});

export const productAndVariantParamSchema = z.object({
  id: z.string().uuid('Invalid product ID format (must be UUID)'),
  variantId: z.string().uuid('Invalid variant ID format (must be UUID)'),
});

export const updatePricingSchema = z.object({
  sellingPrice: z
    .string()
    .regex(moneyRegex, 'Selling price must be a valid 2-decimal amount')
    .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
  costPrice: z
    .string()
    .regex(moneyRegex, 'Cost price must be a valid 2-decimal amount')
    .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
    .optional(),
  currency: z.string().trim().min(3).max(10).optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID format (must be UUID)'),
});

export const productQuerySchema = z.object({
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
  categoryId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
  search: z.string().trim().optional(),
});

export const resourceTypeEnum = z.enum([
  'HOW_TO_BUY',
  'HOW_TO_USE',
  'TUTORIAL',
  'VIDEO',
  'FILE',
  'DOCUMENTATION',
  'SUPPORT',
  'OTHER',
]);

export const createResourceSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: resourceTypeEnum,
  purpose: z.string().trim().max(500).optional(),
  url: z.string().trim().url('Must be a valid URL'),
  productId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
  sortOrder: z.number().int().default(0),
});

export const updateResourceSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  type: resourceTypeEnum.optional(),
  purpose: z.string().trim().max(500).optional(),
  url: z.string().trim().url('Must be a valid URL').optional(),
  productId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateResourceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export const resourceIdParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format (must be UUID)'),
});

export const resourceQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 50))),
  type: resourceTypeEnum.optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  productId: z.string().uuid().optional(),
});

export const auditLogQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 50))),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  adminUserId: z.string().uuid().optional(),
});

export const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});
