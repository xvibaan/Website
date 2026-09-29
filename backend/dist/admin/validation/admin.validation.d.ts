import { z } from 'zod';
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
}, z.core.$strip>;
export declare const timeRangeEnum: z.ZodEnum<{
    TODAY: "TODAY";
    YESTERDAY: "YESTERDAY";
    LAST_7_DAYS: "LAST_7_DAYS";
    LAST_30_DAYS: "LAST_30_DAYS";
    THIS_MONTH: "THIS_MONTH";
    LAST_MONTH: "LAST_MONTH";
    THIS_YEAR: "THIS_YEAR";
    ALL_TIME: "ALL_TIME";
    CUSTOM: "CUSTOM";
}>;
export declare const analyticsFilterSchema: z.ZodObject<{
    timeRange: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        TODAY: "TODAY";
        YESTERDAY: "YESTERDAY";
        LAST_7_DAYS: "LAST_7_DAYS";
        LAST_30_DAYS: "LAST_30_DAYS";
        THIS_MONTH: "THIS_MONTH";
        LAST_MONTH: "LAST_MONTH";
        THIS_YEAR: "THIS_YEAR";
        ALL_TIME: "ALL_TIME";
        CUSTOM: "CUSTOM";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    providerId: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const customerQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        customer: "customer";
        admin: "admin";
    }>>;
    isActive: z.ZodPipe<z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>, z.ZodTransform<boolean | undefined, "true" | "false" | undefined>>;
}, z.core.$strip>;
export declare const customerIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const updateCustomerStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const categoryQuerySchema: z.ZodObject<{
    isActive: z.ZodPipe<z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>, z.ZodTransform<boolean | undefined, "true" | "false" | undefined>>;
}, z.core.$strip>;
export declare const createCategorySchema: z.ZodObject<{
    slug: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCategoryStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const categoryIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    categoryId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    providerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    providerProductId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    shortDescription: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originalPrice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sellingPrice: z.ZodString;
    costPrice: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    currency: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        OUT_OF_STOCK: "OUT_OF_STOCK";
        DISCONTINUED: "DISCONTINUED";
    }>>;
    specs: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>, z.ZodTransform<string | null, string | any[] | Record<string, any> | null | undefined>>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    providerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    providerProductId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    shortDescription: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originalPrice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sellingPrice: z.ZodOptional<z.ZodString>;
    costPrice: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        OUT_OF_STOCK: "OUT_OF_STOCK";
        DISCONTINUED: "DISCONTINUED";
    }>>;
    specs: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>, z.ZodTransform<string | null, string | any[] | Record<string, any> | null | undefined>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateProductStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        OUT_OF_STOCK: "OUT_OF_STOCK";
        DISCONTINUED: "DISCONTINUED";
    }>;
}, z.core.$strip>;
export declare const createVariantSchema: z.ZodPipe<z.ZodObject<{
    name: z.ZodString;
    duration: z.ZodDefault<z.ZodString>;
    originalPrice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sellingPrice: z.ZodString;
    costPrice: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    specs: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>, z.ZodTransform<string | null, string | any[] | Record<string, any> | null | undefined>>;
    availableStock: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, z.ZodTransform<{
    availableStock: number;
    name: string;
    duration: string;
    sellingPrice: string;
    costPrice: string;
    specs: string | null;
    isActive: boolean;
    sortOrder: number;
    originalPrice?: string | null | undefined;
    stock?: number | undefined;
}, {
    name: string;
    duration: string;
    sellingPrice: string;
    costPrice: string;
    specs: string | null;
    isActive: boolean;
    sortOrder: number;
    originalPrice?: string | null | undefined;
    availableStock?: number | undefined;
    stock?: number | undefined;
}>>;
export declare const updateVariantSchema: z.ZodPipe<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodString>;
    originalPrice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sellingPrice: z.ZodOptional<z.ZodString>;
    costPrice: z.ZodOptional<z.ZodString>;
    specs: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>, z.ZodTransform<string | null, string | any[] | Record<string, any> | null | undefined>>;
    availableStock: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodTransform<{
    availableStock: number | undefined;
    specs: string | null;
    name?: string | undefined;
    duration?: string | undefined;
    originalPrice?: string | null | undefined;
    sellingPrice?: string | undefined;
    costPrice?: string | undefined;
    stock?: number | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
}, {
    specs: string | null;
    name?: string | undefined;
    duration?: string | undefined;
    originalPrice?: string | null | undefined;
    sellingPrice?: string | undefined;
    costPrice?: string | undefined;
    availableStock?: number | undefined;
    stock?: number | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
}>>;
export declare const updateVariantStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const productAndVariantParamSchema: z.ZodObject<{
    id: z.ZodString;
    variantId: z.ZodString;
}, z.core.$strip>;
export declare const updatePricingSchema: z.ZodObject<{
    sellingPrice: z.ZodString;
    costPrice: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const productIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const productQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    categoryId: z.ZodOptional<z.ZodString>;
    providerId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        OUT_OF_STOCK: "OUT_OF_STOCK";
        DISCONTINUED: "DISCONTINUED";
    }>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const resourceTypeEnum: z.ZodEnum<{
    HOW_TO_BUY: "HOW_TO_BUY";
    HOW_TO_USE: "HOW_TO_USE";
    TUTORIAL: "TUTORIAL";
    VIDEO: "VIDEO";
    FILE: "FILE";
    DOCUMENTATION: "DOCUMENTATION";
    SUPPORT: "SUPPORT";
    OTHER: "OTHER";
}>;
export declare const createResourceSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        HOW_TO_BUY: "HOW_TO_BUY";
        HOW_TO_USE: "HOW_TO_USE";
        TUTORIAL: "TUTORIAL";
        VIDEO: "VIDEO";
        FILE: "FILE";
        DOCUMENTATION: "DOCUMENTATION";
        SUPPORT: "SUPPORT";
        OTHER: "OTHER";
    }>;
    purpose: z.ZodOptional<z.ZodString>;
    url: z.ZodString;
    productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
    }>>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateResourceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        HOW_TO_BUY: "HOW_TO_BUY";
        HOW_TO_USE: "HOW_TO_USE";
        TUTORIAL: "TUTORIAL";
        VIDEO: "VIDEO";
        FILE: "FILE";
        DOCUMENTATION: "DOCUMENTATION";
        SUPPORT: "SUPPORT";
        OTHER: "OTHER";
    }>>;
    purpose: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateResourceStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
    }>;
}, z.core.$strip>;
export declare const resourceIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const resourceQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    type: z.ZodOptional<z.ZodEnum<{
        HOW_TO_BUY: "HOW_TO_BUY";
        HOW_TO_USE: "HOW_TO_USE";
        TUTORIAL: "TUTORIAL";
        VIDEO: "VIDEO";
        FILE: "FILE";
        DOCUMENTATION: "DOCUMENTATION";
        SUPPORT: "SUPPORT";
        OTHER: "OTHER";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
    }>>;
    productId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const auditLogQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    action: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    adminUserId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSettingsSchema: z.ZodObject<{
    settings: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
