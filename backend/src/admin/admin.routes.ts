import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { dashboardRoutes } from './routes/dashboard.routes';
import { customerAdminRoutes } from './routes/customers.routes';
import { categoryAdminRoutes } from './routes/categories.routes';
import { productAdminRoutes } from './routes/products.routes';
import { pricingAdminRoutes } from './routes/pricing.routes';
import { resourceAdminRoutes } from './routes/resources.routes';
import { auditAdminRoutes } from './routes/audit.routes';
import { settingsAdminRoutes } from './routes/settings.routes';
import { analyticsAdminRoutes } from './routes/analytics.routes';
import { orderAdminRoutes } from './routes/orders.routes';
import { walletAdminRoutes } from './routes/wallets.routes';
import { paymentAdminRoutes } from './routes/payments.routes';
import { providerRoutes } from '../providers/routes/provider.routes';
import { mediaAdminRoutes } from './routes/media.routes';
import { alertRoutes } from './routes/alert.routes';
import { resellerAdminRoutes } from './routes/resellers.routes';
import { websiteInstanceAdminRoutes } from './routes/website-instances.routes';
export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Enforce server-side authentication and admin RBAC across all /api/v1/admin endpoints
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  /**
   * GET /api/v1/admin/health
   * Protected Admin Boundary check
   */
  app.get('/health', async (request) => {
    return {
      status: 'ok',
      admin: {
        id: request.user?.userId,
        email: request.user?.email,
        role: request.user?.role,
      },
    };
  });

  // Admin Dashboard Overview
  app.register(dashboardRoutes, { prefix: '/dashboard' });

  // Customer Management
  app.register(customerAdminRoutes, { prefix: '/customers' });

  // Product & Category Management
  app.register(categoryAdminRoutes, { prefix: '/categories' });
  app.register(productAdminRoutes, { prefix: '/products' });
  app.register(pricingAdminRoutes, { prefix: '/pricing' });

  // Centralized Resources (How to Buy, Tutorials, Support Links)
  app.register(resourceAdminRoutes, { prefix: '/resources' });

  // Immutable Audit Logs
  app.register(auditAdminRoutes, { prefix: '/audit-logs' });

  // Platform Configuration & Settings
  app.register(settingsAdminRoutes, { prefix: '/settings' });

  // Real Database Analytics
  app.register(analyticsAdminRoutes, { prefix: '/analytics' });

  // Order Management Contract (Phase 8 integration)
  app.register(orderAdminRoutes, { prefix: '/orders' });

  // Central Wallet Admin Management
  app.register(walletAdminRoutes, { prefix: '/wallets' });
  app.register(walletAdminRoutes, { prefix: '/wallet' });

  // Central Payment Admin Management
  app.register(paymentAdminRoutes, { prefix: '/payments' });

  // Multi-Provider Management (Phase 6 reuse)
  app.register(providerRoutes, { prefix: '/providers' });

  // Product Media Upload & Management (Phase 3C)
  app.register(mediaAdminRoutes, { prefix: '/media' });

  // System Alerts (Operational Monitoring)
  // System Alerts (Operational Monitoring)
  app.register(alertRoutes, { prefix: '/alerts' });

  // Reseller Management
  app.register(resellerAdminRoutes, { prefix: '/resellers' });

  // Website Instances
  app.register(websiteInstanceAdminRoutes, { prefix: '/website-instances' });
};
