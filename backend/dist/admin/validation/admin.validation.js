"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = exports.auditLogQuerySchema = exports.resourceQuerySchema = exports.resourceIdParamSchema = exports.updateResourceStatusSchema = exports.updateResourceSchema = exports.createResourceSchema = exports.resourceTypeEnum = exports.productQuerySchema = exports.productIdParamSchema = exports.updatePricingSchema = exports.productAndVariantParamSchema = exports.updateVariantStatusSchema = exports.updateVariantSchema = exports.createVariantSchema = exports.updateProductStatusSchema = exports.updateProductSchema = exports.createProductSchema = exports.categoryIdParamSchema = exports.updateCategoryStatusSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.categoryQuerySchema = exports.updateCustomerStatusSchema = exports.customerIdParamSchema = exports.customerQuerySchema = exports.analyticsFilterSchema = exports.timeRangeEnum = exports.paginationQuerySchema = void 0;
const zod_1 = require("zod");
// Standard 2-decimal monetary regex
const moneyRegex = /^\d+(\.\d{1,2})?$/;
exports.paginationQuerySchema = zod_1.z.object({
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
});
exports.timeRangeEnum = zod_1.z.enum([
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
exports.analyticsFilterSchema = zod_1.z.object({
    timeRange: exports.timeRangeEnum.optional().default('LAST_30_DAYS'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    providerId: zod_1.z.string().uuid().optional(),
    productId: zod_1.z.string().uuid().optional(),
});
exports.customerQuerySchema = zod_1.z.object({
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
    search: zod_1.z.string().trim().optional(),
    role: zod_1.z.enum(['customer', 'admin']).optional(),
    isActive: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => (val === undefined ? undefined : val === 'true')),
});
exports.customerIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid customer ID format (must be UUID)'),
});
exports.updateCustomerStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
    reason: zod_1.z.string().trim().max(300).optional(),
});
exports.categoryQuerySchema = zod_1.z.object({
    isActive: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => (val === undefined ? undefined : val === 'true')),
});
exports.createCategorySchema = zod_1.z.object({
    slug: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(2, 'Slug must be at least 2 characters')
        .max(50, 'Slug cannot exceed 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    description: zod_1.z.string().trim().max(500).optional(),
    icon: zod_1.z.string().trim().max(50).optional(),
    isActive: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().int().default(0),
});
exports.updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100).optional(),
    description: zod_1.z.string().trim().max(500).optional(),
    icon: zod_1.z.string().trim().max(50).optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.updateCategoryStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.categoryIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid category ID format (must be UUID)'),
});
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
    slug: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(2)
        .max(150)
        .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
    categoryId: zod_1.z.string().uuid('Invalid categoryId UUID').optional().nullable(),
    providerId: zod_1.z.string().uuid('Invalid providerId UUID').optional().nullable(),
    providerProductId: zod_1.z.string().trim().max(100).optional().nullable(),
    shortDescription: zod_1.z.string().trim().max(500).optional().nullable(),
    description: zod_1.z.string().trim().max(2000).optional().nullable(),
    imageUrl: zod_1.z.string().trim().max(1000).optional().nullable(),
    originalPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
        .optional()
        .nullable(),
    sellingPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
    costPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
        .optional()
        .default('0.00'),
    currency: zod_1.z.string().trim().min(3).max(10).default('INR'),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).default('ACTIVE'),
    specs: zod_1.z
        .union([zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.any()), zod_1.z.array(zod_1.z.any())])
        .optional()
        .nullable()
        .transform((val) => {
        if (val === undefined || val === null)
            return null;
        if (typeof val === 'object')
            return JSON.stringify(val);
        return String(val);
    }),
    sortOrder: zod_1.z.number().int().default(0),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(150).optional(),
    slug: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(2)
        .max(150)
        .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
        .optional(),
    categoryId: zod_1.z.string().uuid().optional().nullable(),
    providerId: zod_1.z.string().uuid().optional().nullable(),
    providerProductId: zod_1.z.string().trim().max(100).optional().nullable(),
    shortDescription: zod_1.z.string().trim().max(500).optional().nullable(),
    description: zod_1.z.string().trim().max(2000).optional().nullable(),
    imageUrl: zod_1.z.string().trim().max(1000).optional().nullable(),
    originalPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Original price must be a valid 2-decimal amount')
        .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
        .optional()
        .nullable(),
    sellingPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Selling price must be a valid 2-decimal amount')
        .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative')
        .optional(),
    costPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Cost price must be a valid 2-decimal amount')
        .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
        .optional(),
    currency: zod_1.z.string().trim().min(3).max(10).optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
    specs: zod_1.z
        .union([zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.any()), zod_1.z.array(zod_1.z.any())])
        .optional()
        .nullable()
        .transform((val) => {
        if (val === undefined || val === null)
            return null;
        if (typeof val === 'object')
            return JSON.stringify(val);
        return String(val);
    }),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.updateProductStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']),
});
exports.createVariantSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1, 'Variant name is required').max(100),
    duration: zod_1.z.string().trim().max(50).default('Lifetime'),
    originalPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
        .optional()
        .nullable(),
    sellingPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
    costPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
        .optional()
        .default('0.00'),
    specs: zod_1.z
        .union([zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.any()), zod_1.z.array(zod_1.z.any())])
        .optional()
        .nullable()
        .transform((val) => {
        if (val === undefined || val === null)
            return null;
        if (typeof val === 'object')
            return JSON.stringify(val);
        return String(val);
    }),
    availableStock: zod_1.z.number().int().min(0, 'Available stock cannot be negative').optional(),
    stock: zod_1.z.number().int().min(0).optional(),
    isActive: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().int().default(0),
})
    .transform((data) => ({
    ...data,
    availableStock: data.availableStock ?? data.stock ?? 999,
}));
exports.updateVariantSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(100).optional(),
    duration: zod_1.z.string().trim().max(50).optional(),
    originalPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Original price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Original price must be non-negative')
        .optional()
        .nullable(),
    sellingPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Selling price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative')
        .optional(),
    costPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Cost price must be a valid 2-decimal monetary amount')
        .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
        .optional(),
    specs: zod_1.z
        .union([zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.any()), zod_1.z.array(zod_1.z.any())])
        .optional()
        .nullable()
        .transform((val) => {
        if (val === undefined || val === null)
            return null;
        if (typeof val === 'object')
            return JSON.stringify(val);
        return String(val);
    }),
    availableStock: zod_1.z.number().int().min(0).optional(),
    stock: zod_1.z.number().int().min(0).optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
})
    .transform((data) => ({
    ...data,
    availableStock: data.availableStock ?? data.stock,
}));
exports.updateVariantStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.productAndVariantParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid product ID format (must be UUID)'),
    variantId: zod_1.z.string().uuid('Invalid variant ID format (must be UUID)'),
});
exports.updatePricingSchema = zod_1.z.object({
    sellingPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Selling price must be a valid 2-decimal amount')
        .refine((v) => parseFloat(v) >= 0, 'Selling price must be non-negative'),
    costPrice: zod_1.z
        .string()
        .regex(moneyRegex, 'Cost price must be a valid 2-decimal amount')
        .refine((v) => parseFloat(v) >= 0, 'Cost price must be non-negative')
        .optional(),
    currency: zod_1.z.string().trim().min(3).max(10).optional(),
});
exports.productIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid product ID format (must be UUID)'),
});
exports.productQuerySchema = zod_1.z.object({
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
    categoryId: zod_1.z.string().uuid().optional(),
    providerId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
    search: zod_1.z.string().trim().optional(),
});
exports.resourceTypeEnum = zod_1.z.enum([
    'HOW_TO_BUY',
    'HOW_TO_USE',
    'TUTORIAL',
    'VIDEO',
    'FILE',
    'DOCUMENTATION',
    'SUPPORT',
    'OTHER',
]);
exports.createResourceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(150),
    type: exports.resourceTypeEnum,
    purpose: zod_1.z.string().trim().max(500).optional(),
    url: zod_1.z.string().trim().url('Must be a valid URL'),
    productId: zod_1.z.string().uuid().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
    sortOrder: zod_1.z.number().int().default(0),
});
exports.updateResourceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(150).optional(),
    type: exports.resourceTypeEnum.optional(),
    purpose: zod_1.z.string().trim().max(500).optional(),
    url: zod_1.z.string().trim().url('Must be a valid URL').optional(),
    productId: zod_1.z.string().uuid().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED']).optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.updateResourceStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'DISABLED']),
});
exports.resourceIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid resource ID format (must be UUID)'),
});
exports.resourceQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default('1')
        .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
    limit: zod_1.z
        .string()
        .optional()
        .default('50')
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 50))),
    type: exports.resourceTypeEnum.optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISABLED']).optional(),
    productId: zod_1.z.string().uuid().optional(),
});
exports.auditLogQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default('1')
        .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
    limit: zod_1.z
        .string()
        .optional()
        .default('50')
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 50))),
    action: zod_1.z.string().trim().optional(),
    entityType: zod_1.z.string().trim().optional(),
    entityId: zod_1.z.string().trim().optional(),
    adminUserId: zod_1.z.string().uuid().optional(),
});
exports.updateSettingsSchema = zod_1.z.object({
    settings: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
});
