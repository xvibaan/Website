import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db/client';
import { categories } from '../db/schema/categories';
import { products } from '../db/schema/products';
import { orders, orderItems } from '../db/schema/orders';
import { eq, notInArray } from 'drizzle-orm';

const OFFICIAL_MARKETPLACE_SLUGS = [
  'gaming',
  'development',
  'redeem-codes',
  'ai-tools',
  'cloud-hosting',
  'software-tools',
];

async function markLegacyCategoriesInactive() {
  const db = getDb();
  console.log('=== SAFELY MARKING LEGACY TEST CATEGORIES INACTIVE ===\n');

  // Verify before state
  const beforeCats = await db.select().from(categories);
  const beforeProds = await db.select().from(products);
  const beforeOrders = await db.select().from(orders);
  const beforeItems = await db.select().from(orderItems);

  console.log(`Initial Counts:`);
  console.log(`- Categories: ${beforeCats.length}`);
  console.log(`- Products: ${beforeProds.length}`);
  console.log(`- Orders: ${beforeOrders.length}`);
  console.log(`- Order Items: ${beforeItems.length}`);

  // Safely mark non-official / Test Cat categories as inactive (DO NOT DELETE)
  const updated = await db
    .update(categories)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(notInArray(categories.slug, OFFICIAL_MARKETPLACE_SLUGS))
    .returning();

  console.log(`\nMarked ${updated.length} legacy/test category records as isActive = false:`);
  for (const c of updated) {
    console.log(`  - [${c.id}] "${c.name}" (slug: ${c.slug}, isActive: ${c.isActive})`);
  }

  // Verify after state
  const afterCats = await db.select().from(categories);
  const afterProds = await db.select().from(products);
  const afterOrders = await db.select().from(orders);
  const afterItems = await db.select().from(orderItems);

  console.log(`\nPost-Update Verification:`);
  console.log(`- Total Categories in DB: ${afterCats.length} (Must remain ${beforeCats.length})`);
  console.log(`- Total Products in DB: ${afterProds.length} (Must remain ${beforeProds.length})`);
  console.log(`- Total Orders in DB: ${afterOrders.length} (Must remain ${beforeOrders.length})`);
  console.log(`- Total Order Items in DB: ${afterItems.length} (Must remain ${beforeItems.length})`);

  const activeOfficialCats = afterCats.filter(c => c.isActive);
  console.log(`\nActive Categories Count: ${activeOfficialCats.length}`);
  for (const c of activeOfficialCats) {
    console.log(`  - [${c.slug}] "${c.name}" (isActive: ${c.isActive}, sortOrder: ${c.sortOrder})`);
  }

  if (afterCats.length !== beforeCats.length) {
    throw new Error('SAFETY CHECK FAILED: Categories were deleted!');
  }
  if (afterProds.length !== beforeProds.length) {
    throw new Error('SAFETY CHECK FAILED: Products were deleted!');
  }
  if (afterOrders.length !== beforeOrders.length) {
    throw new Error('SAFETY CHECK FAILED: Orders were deleted!');
  }
  if (afterItems.length !== beforeItems.length) {
    throw new Error('SAFETY CHECK FAILED: Order items were deleted!');
  }

  console.log('\n=== SUCCESS: All historical records intact. Zero records deleted. ===');
}

markLegacyCategoriesInactive()
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
