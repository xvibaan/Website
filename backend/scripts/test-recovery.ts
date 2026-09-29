import { getDb, closeDbPool } from '../src/db/client';
import { users } from '../src/db/schema/users';
import { providers } from '../src/db/schema/providers';
import { categories } from '../src/db/schema/categories';
import { products } from '../src/db/schema/products';
import { wallets } from '../src/db/schema/wallets';
import { walletLedgerEntries } from '../src/db/schema/wallet-ledger';
import { providerRegistry } from '../src/providers/registry/ProviderRegistry';
import { IProviderAdapter } from '../src/providers/interfaces/IProviderAdapter';
import { orderService } from '../src/orders/order.service';
import { walletService } from '../src/wallet/wallet.service';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

// Mock Provider Adapter that fails
class MockFailingProvider implements IProviderAdapter {
  providerCode = 'test-fail';
  providerName = 'Test Fail';
  version = '1.0';

  async testConnection() { return { success: true, responseTimeMs: 10, message: 'ok', timestamp: new Date() }; }
  async getProviderInfo() { return { code: this.providerCode, name: this.providerName, version: this.version, adapterType: 'test', capabilities: [], supportedServices: [] }; }
  
  async fulfillOrder(req: any) {
    return {
      providerOrderId: 'fail-123',
      status: 'FAILED' as const,
      createdAt: new Date()
    };
  }
}

// Mock Provider Adapter that succeeds
class MockSuccessProvider implements IProviderAdapter {
  providerCode = 'test-success';
  providerName = 'Test Success';
  version = '1.0';

  async testConnection() { return { success: true, responseTimeMs: 10, message: 'ok', timestamp: new Date() }; }
  async getProviderInfo() { return { code: this.providerCode, name: this.providerName, version: this.version, adapterType: 'test', capabilities: [], supportedServices: [] }; }
  
  async fulfillOrder(req: any) {
    return {
      providerOrderId: 'succ-123',
      status: 'ACTIVE' as const,
      createdAt: new Date()
    };
  }
}

async function runTest() {
  console.log("Setting up test data...");
  const db = getDb();
  
  // Register mocks
  providerRegistry.registerAdapter(new MockFailingProvider());
  providerRegistry.registerAdapter(new MockSuccessProvider());

  // Create User
  const [user] = await db.insert(users).values({
    email: 'test-recovery@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    fullName: 'Test Recovery',
    role: 'customer'
  }).returning();

  // Add 1000 to wallet
  await walletService.creditWallet({
    userId: user.id,
    amount: '1000.00',
    referenceType: 'deposit',
    description: 'Initial balance'
  });

  // Create Providers in DB
  const [failProv] = await db.insert(providers).values({
    code: 'test-fail',
    name: 'Test Fail',
    adapterType: 'test',
    isEnabled: true
  }).returning();

  const [succProv] = await db.insert(providers).values({
    code: 'test-success',
    name: 'Test Success',
    adapterType: 'test',
    isEnabled: true
  }).returning();

  const [category] = await db.insert(categories).values({
    name: 'Test Cat',
    slug: 'test-cat',
    isActive: true
  }).returning();

  // Create Products
  const [prodFail] = await db.insert(products).values({
    name: 'Product Fail',
    slug: 'prod-fail',
    sellingPrice: '300.00',
    providerId: failProv.id,
    categoryId: category.id,
    status: 'ACTIVE'
  }).returning();

  const [prodSucc] = await db.insert(products).values({
    name: 'Product Succ',
    slug: 'prod-succ',
    sellingPrice: '300.00',
    providerId: succProv.id,
    categoryId: category.id,
    status: 'ACTIVE'
  }).returning();

  // Test 1: Successful Provider
  console.log("\n--- TEST 1: SUCCESSFUL PROVIDER ---");
  const successOrder = await orderService.createOrder(user.id, prodSucc.id, 1, 'idem-succ-1');
  console.log(`Order Status: ${successOrder.status}`);
  
  let w = await db.select().from(wallets).where(eq(wallets.userId, user.id));
  console.log(`Wallet Balance: ${w[0].balance} (Expected 700.00)`);

  // Test 2: Failing Provider (Refund)
  console.log("\n--- TEST 2: FAILING PROVIDER (REFUND) ---");
  const failOrder = await orderService.createOrder(user.id, prodFail.id, 1, 'idem-fail-1');
  console.log(`Order Status: ${failOrder.status}`);
  
  w = await db.select().from(wallets).where(eq(wallets.userId, user.id));
  console.log(`Wallet Balance: ${w[0].balance} (Expected 700.00)`);

  const txs = await db.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.userId, user.id));
  const refunds = txs.filter(t => t.referenceType === 'refund');
  console.log(`Refunds generated: ${refunds.length} (Expected 1)`);

  // Test 3: Idempotency Duplicate Purchase
  console.log("\n--- TEST 3: IDEMPOTENCY ---");
  const dupOrder = await orderService.createOrder(user.id, prodFail.id, 1, 'idem-fail-1');
  console.log(`Duplicate Order ID match original? ${dupOrder.id === failOrder.id}`);
  
  w = await db.select().from(wallets).where(eq(wallets.userId, user.id));
  console.log(`Wallet Balance: ${w[0].balance} (Expected 700.00)`);

  // Cleanup
  console.log("\nCleaning up...");
  await db.delete(users).where(eq(users.id, user.id)); // cascading should clean up most
  await db.delete(providers).where(eq(providers.code, 'test-fail'));
  await db.delete(providers).where(eq(providers.code, 'test-success'));
  await closeDbPool();
  console.log("Done.");
}

runTest().catch(console.error);
