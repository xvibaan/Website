import { z } from 'zod';
export declare const amountStringSchema: z.ZodString;
export declare const createPaymentSchema: z.ZodObject<{
    amount: z.ZodString;
    currency: z.ZodDefault<z.ZodString> & z.ZodType<"INR" | "USDT", string | undefined, z.core.$ZodTypeInternals<"INR" | "USDT", string | undefined>>;
    purpose: z.ZodDefault<z.ZodEnum<{
        WALLET_RECHARGE: "WALLET_RECHARGE";
    }>>;
    gateway: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const paymentHistoryQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
export declare const adminPaymentQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        PROCESSING: "PROCESSING";
        REFUNDED: "REFUNDED";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
        SUCCESS: "SUCCESS";
        PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED";
    }>>;
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const paymentIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const webhookParamSchema: z.ZodObject<{
    gateway: z.ZodString;
}, z.core.$strip>;
