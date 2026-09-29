import { z } from 'zod';

export const CreateWebsiteInstanceSchema = z.object({
  instanceName: z.string().min(2),
  resellerId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING']).default('PENDING'),
});

export const UpdateWebsiteInstanceSchema = z.object({
  instanceName: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING']).optional(),
  primaryDomain: z.string().optional(),
});

export const CreateDomainRouteSchema = z.object({
  hostname: z.string().min(3),
  hostnameType: z.enum(['SUBDOMAIN', 'CUSTOM_DOMAIN']),
});

export const UpdateDomainRouteSchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'DISABLED']).optional(),
  isPrimary: z.boolean().optional(),
});
