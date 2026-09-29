"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDomainRouteSchema = exports.CreateDomainRouteSchema = exports.UpdateWebsiteInstanceSchema = exports.CreateWebsiteInstanceSchema = void 0;
const zod_1 = require("zod");
exports.CreateWebsiteInstanceSchema = zod_1.z.object({
    instanceName: zod_1.z.string().min(2),
    resellerId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING']).default('PENDING'),
});
exports.UpdateWebsiteInstanceSchema = zod_1.z.object({
    instanceName: zod_1.z.string().min(2).optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING']).optional(),
    primaryDomain: zod_1.z.string().optional(),
});
exports.CreateDomainRouteSchema = zod_1.z.object({
    hostname: zod_1.z.string().min(3),
    hostnameType: zod_1.z.enum(['SUBDOMAIN', 'CUSTOM_DOMAIN']),
});
exports.UpdateDomainRouteSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'DISABLED']).optional(),
    isPrimary: zod_1.z.boolean().optional(),
});
