import { z } from 'zod';
export declare const CreateResellerSchema: z.ZodObject<{
    businessName: z.ZodString;
    code: z.ZodString;
    ownerEmail: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        SUSPENDED: "SUSPENDED";
    }>>;
    plan: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const UpdateResellerSchema: z.ZodObject<{
    businessName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        SUSPENDED: "SUSPENDED";
    }>>;
    plan: z.ZodOptional<z.ZodString>;
    apiAccessEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
