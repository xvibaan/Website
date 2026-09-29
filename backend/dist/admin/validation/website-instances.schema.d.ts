import { z } from 'zod';
export declare const CreateWebsiteInstanceSchema: z.ZodObject<{
    instanceName: z.ZodString;
    resellerId: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        SUSPENDED: "SUSPENDED";
    }>>;
}, z.core.$strip>;
export declare const UpdateWebsiteInstanceSchema: z.ZodObject<{
    instanceName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        DISABLED: "DISABLED";
        SUSPENDED: "SUSPENDED";
    }>>;
    primaryDomain: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CreateDomainRouteSchema: z.ZodObject<{
    hostname: z.ZodString;
    hostnameType: z.ZodEnum<{
        SUBDOMAIN: "SUBDOMAIN";
        CUSTOM_DOMAIN: "CUSTOM_DOMAIN";
    }>;
}, z.core.$strip>;
export declare const UpdateDomainRouteSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        PENDING_VERIFICATION: "PENDING_VERIFICATION";
        DISABLED: "DISABLED";
        VERIFIED: "VERIFIED";
    }>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
