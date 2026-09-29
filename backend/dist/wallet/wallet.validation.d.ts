import { z } from 'zod';
export declare const amountStringSchema: z.ZodString;
export declare const ledgerQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
export declare const adminAdjustSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodString;
    direction: z.ZodEnum<{
        credit: "credit";
        debit: "debit";
    }>;
    reason: z.ZodString;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LedgerQueryParams = z.infer<typeof ledgerQuerySchema>;
export type AdminAdjustInput = z.infer<typeof adminAdjustSchema>;
