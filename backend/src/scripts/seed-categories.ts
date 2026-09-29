import dotenv from 'dotenv';
dotenv.config();

import { getDb, closeDbPool } from '../db/client';
import { categories } from '../db/schema/categories';
import { sql } from 'drizzle-orm';

export const OFFICIAL_CATEGORIES = [
  {
    slug: 'gaming',
    name: 'Gaming',
    description: 'Gaming Tools, Utilities & Enhancements',
    icon: '🎮',
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: 'development',
    name: 'Development',
    description: 'Modern backend frameworks, custom APIs, web architectures, and full-stack solutions.',
    icon: '💻',
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: 'redeem-codes',
    name: 'Redeem Codes',
    description: 'Official digital game codes, gift cards, subscription vouchers, and digital credits.',
    icon: '🎁',
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: 'ai-tools',
    name: 'AI Tools',
    description: 'Next-gen LLM integration, inference pipelines, and automated intelligence engines.',
    icon: '🤖',
    sortOrder: 4,
    isActive: true,
  },
  {
    slug: 'cloud-hosting',
    name: 'Cloud Hosting',
    description: 'High-availability edge networks, protected VPS nodes, and automated cloud deployments.',
    icon: '☁️',
    sortOrder: 5,
    isActive: true,
  },
  {
    slug: 'software-tools',
    name: 'Software Tools',
    description: 'Essential compilation utilities, CLI tooling, and workflow automation suites.',
    icon: '🛠️',
    sortOrder: 6,
    isActive: true,
  },
];

export async function seedOfficialCategories() {
  const db = getDb();
  console.log('Seeding official categories (idempotent)...');

  for (const cat of OFFICIAL_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  console.log(`Successfully seeded/updated all ${OFFICIAL_CATEGORIES.length} official categories.`);
}

async function run() {
  try {
    await seedOfficialCategories();
  } catch (err) {
    console.error('Failed to seed official categories:', err);
    process.exitCode = 1;
  } finally {
    await closeDbPool();
  }
}

if (require.main === module || !process.env.TEST_ENV) {
  run();
}
