import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { resellerService } from '../services/resellers.service';
import { CreateResellerSchema, UpdateResellerSchema } from '../validation/resellers.schema';
import { auditService } from '../services/audit.service';
import { resellerWalletService } from '../../reseller/reseller.wallet.service';
import { z } from 'zod';

const AdjustmentSchema = z.object({
  amount: z.string(),
  reason: z.string().min(3),
});

export const resellerAdminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/', async (request, reply) => {
    const resellersList = await resellerService.listResellers();
    return reply.send({ data: resellersList });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const reseller = await resellerService.getReseller(id);
    if (!reseller) {
      return reply.status(404).send({ error: 'Reseller not found' });
    }
    return reply.send({ data: reseller });
  });

  app.post('/', async (request, reply) => {
    const parseResult = CreateResellerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    try {
      const reseller = await resellerService.createReseller(parseResult.data);
      
      await auditService.record({
        adminUserId: request.user?.userId || 'system',
        action: 'CREATE_RESELLER',
        entityType: 'RESELLER',
        entityId: reseller.id,
        details: { code: reseller.code },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ data: reseller });
    } catch (err: any) {
      if (err.message === 'RESELLER_CODE_IN_USE') {
        return reply.status(400).send({ error: 'Reseller code already in use' });
      }
      throw err;
    }
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateResellerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const updated = await resellerService.updateReseller(id, parseResult.data);
    if (!updated) {
      return reply.status(404).send({ error: 'Reseller not found' });
    }

    await auditService.record({
      adminUserId: request.user?.userId || 'system',
      action: 'UPDATE_RESELLER',
      entityType: 'RESELLER',
      entityId: updated.id,
      details: { changes: parseResult.data },
      ipAddress: request.ip,
    });

    return reply.send({ data: updated });
  });

  app.post('/:id/api-token', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { secret } = await resellerService.generateApiToken(id);

    await auditService.record({
      adminUserId: request.user?.userId || 'system',
      action: 'GENERATE_RESELLER_API_TOKEN',
      entityType: 'RESELLER',
      entityId: id,
      details: {},
      ipAddress: request.ip,
    });

    return reply.send({ data: { secret, message: 'Store this secret securely. It will not be shown again.' } });
  });

  app.delete('/:id/api-token', async (request, reply) => {
    const { id } = request.params as { id: string };
    await resellerService.revokeApiToken(id);

    await auditService.record({
      adminUserId: request.user?.userId || 'system',
      action: 'REVOKE_RESELLER_API_TOKEN',
      entityType: 'RESELLER',
      entityId: id,
      details: {},
      ipAddress: request.ip,
    });

    return reply.send({ success: true });
  });

  app.get('/:id/wallet', async (request, reply) => {
    const { id } = request.params as { id: string };
    const wallet = await resellerWalletService.getOrCreateWallet(id);
    return reply.send({ data: wallet });
  });

  app.get('/:id/wallet/ledger', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ledger = await resellerWalletService.getLedger(id);
    return reply.send({ data: ledger });
  });

  app.post('/:id/wallet/credit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = AdjustmentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const adminUserId = request.user?.userId || 'system';
    const idempotencyKey = `admin-credit-${id}-${Date.now()}`;

    const { wallet, ledgerEntry } = await resellerWalletService.creditWallet({
      resellerId: id,
      amount: parseResult.data.amount,
      referenceType: 'adjustment',
      idempotencyKey,
      description: `Admin Credit: ${parseResult.data.reason}`,
    });

    await auditService.record({
      adminUserId,
      action: 'CREDIT_RESELLER_WALLET',
      entityType: 'RESELLER',
      entityId: id,
      details: { amount: parseResult.data.amount, reason: parseResult.data.reason },
      ipAddress: request.ip,
    });

    return reply.send({ data: { wallet, ledgerEntry } });
  });

  app.post('/:id/wallet/debit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = AdjustmentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const adminUserId = request.user?.userId || 'system';
    const idempotencyKey = `admin-debit-${id}-${Date.now()}`;

    try {
      const { wallet, ledgerEntry } = await resellerWalletService.debitWallet({
        resellerId: id,
        amount: parseResult.data.amount,
        referenceType: 'adjustment',
        idempotencyKey,
        description: `Admin Debit: ${parseResult.data.reason}`,
      });

      await auditService.record({
        adminUserId,
        action: 'DEBIT_RESELLER_WALLET',
        entityType: 'RESELLER',
        entityId: id,
        details: { amount: parseResult.data.amount, reason: parseResult.data.reason },
        ipAddress: request.ip,
      });

      return reply.send({ data: { wallet, ledgerEntry } });
    } catch (err: any) {
      return reply.status(422).send({ error: err.message });
    }
  });
};
