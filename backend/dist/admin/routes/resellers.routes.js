"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resellerAdminRoutes = void 0;
const resellers_service_1 = require("../services/resellers.service");
const resellers_schema_1 = require("../validation/resellers.schema");
const audit_service_1 = require("../services/audit.service");
const reseller_wallet_service_1 = require("../../reseller/reseller.wallet.service");
const zod_1 = require("zod");
const AdjustmentSchema = zod_1.z.object({
    amount: zod_1.z.string(),
    reason: zod_1.z.string().min(3),
});
const resellerAdminRoutes = async (app) => {
    app.get('/', async (request, reply) => {
        const resellersList = await resellers_service_1.resellerService.listResellers();
        return reply.send({ data: resellersList });
    });
    app.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const reseller = await resellers_service_1.resellerService.getReseller(id);
        if (!reseller) {
            return reply.status(404).send({ error: 'Reseller not found' });
        }
        return reply.send({ data: reseller });
    });
    app.post('/', async (request, reply) => {
        const parseResult = resellers_schema_1.CreateResellerSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        try {
            const reseller = await resellers_service_1.resellerService.createReseller(parseResult.data);
            await audit_service_1.auditService.record({
                adminUserId: request.user?.userId || 'system',
                action: 'CREATE_RESELLER',
                entityType: 'RESELLER',
                entityId: reseller.id,
                details: { code: reseller.code },
                ipAddress: request.ip,
            });
            return reply.status(201).send({ data: reseller });
        }
        catch (err) {
            if (err.message === 'RESELLER_CODE_IN_USE') {
                return reply.status(400).send({ error: 'Reseller code already in use' });
            }
            throw err;
        }
    });
    app.patch('/:id', async (request, reply) => {
        const { id } = request.params;
        const parseResult = resellers_schema_1.UpdateResellerSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        const updated = await resellers_service_1.resellerService.updateReseller(id, parseResult.data);
        if (!updated) {
            return reply.status(404).send({ error: 'Reseller not found' });
        }
        await audit_service_1.auditService.record({
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
        const { id } = request.params;
        const { secret } = await resellers_service_1.resellerService.generateApiToken(id);
        await audit_service_1.auditService.record({
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
        const { id } = request.params;
        await resellers_service_1.resellerService.revokeApiToken(id);
        await audit_service_1.auditService.record({
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
        const { id } = request.params;
        const wallet = await reseller_wallet_service_1.resellerWalletService.getOrCreateWallet(id);
        return reply.send({ data: wallet });
    });
    app.get('/:id/wallet/ledger', async (request, reply) => {
        const { id } = request.params;
        const ledger = await reseller_wallet_service_1.resellerWalletService.getLedger(id);
        return reply.send({ data: ledger });
    });
    app.post('/:id/wallet/credit', async (request, reply) => {
        const { id } = request.params;
        const parseResult = AdjustmentSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        const adminUserId = request.user?.userId || 'system';
        const idempotencyKey = `admin-credit-${id}-${Date.now()}`;
        const { wallet, ledgerEntry } = await reseller_wallet_service_1.resellerWalletService.creditWallet({
            resellerId: id,
            amount: parseResult.data.amount,
            referenceType: 'adjustment',
            idempotencyKey,
            description: `Admin Credit: ${parseResult.data.reason}`,
        });
        await audit_service_1.auditService.record({
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
        const { id } = request.params;
        const parseResult = AdjustmentSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.issues });
        }
        const adminUserId = request.user?.userId || 'system';
        const idempotencyKey = `admin-debit-${id}-${Date.now()}`;
        try {
            const { wallet, ledgerEntry } = await reseller_wallet_service_1.resellerWalletService.debitWallet({
                resellerId: id,
                amount: parseResult.data.amount,
                referenceType: 'adjustment',
                idempotencyKey,
                description: `Admin Debit: ${parseResult.data.reason}`,
            });
            await audit_service_1.auditService.record({
                adminUserId,
                action: 'DEBIT_RESELLER_WALLET',
                entityType: 'RESELLER',
                entityId: id,
                details: { amount: parseResult.data.amount, reason: parseResult.data.reason },
                ipAddress: request.ip,
            });
            return reply.send({ data: { wallet, ledgerEntry } });
        }
        catch (err) {
            return reply.status(422).send({ error: err.message });
        }
    });
};
exports.resellerAdminRoutes = resellerAdminRoutes;
