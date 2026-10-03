import { z } from 'zod';
export declare const providerCodeRegex: RegExp;
export declare const createProviderSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    adapterType: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    isEnabled: z.ZodDefault<z.ZodBoolean>;
    isMaintenance: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateProviderStateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    isMaintenance: z.ZodOptional<z.ZodBoolean>;
    state: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        MAINTENANCE: "MAINTENANCE";
        DISABLED: "DISABLED";
    }>>;
    reason: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
    encryptedCredentials: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const providerIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const providerQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    limit: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>;
    isEnabled: z.ZodPipe<z.ZodOptional<z.ZodEnum<{
        false: "false";
        true: "true";
    }>>, z.ZodTransform<boolean | undefined, "false" | "true" | undefined>>;
    health: z.ZodOptional<z.ZodEnum<{
        UNKNOWN: "UNKNOWN";
        HEALTHY: "HEALTHY";
        UNHEALTHY: "UNHEALTHY";
        DEGRADED: "DEGRADED";
    }>>;
}, z.core.$strip>;
