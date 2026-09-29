"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFICIAL_CATEGORIES = void 0;
exports.seedOfficialCategories = seedOfficialCategories;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client_1 = require("../db/client");
const categories_1 = require("../db/schema/categories");
const drizzle_orm_1 = require("drizzle-orm");
exports.OFFICIAL_CATEGORIES = [
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
async function seedOfficialCategories() {
    const db = (0, client_1.getDb)();
    console.log('Seeding official categories (idempotent)...');
    for (const cat of exports.OFFICIAL_CATEGORIES) {
        await db
            .insert(categories_1.categories)
            .values({
            slug: cat.slug,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
        })
            .onConflictDoUpdate({
            target: categories_1.categories.slug,
            set: {
                name: cat.name,
                description: cat.description,
                icon: cat.icon,
                sortOrder: cat.sortOrder,
                isActive: cat.isActive,
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`,
            },
        });
    }
    console.log(`Successfully seeded/updated all ${exports.OFFICIAL_CATEGORIES.length} official categories.`);
}
async function run() {
    try {
        await seedOfficialCategories();
    }
    catch (err) {
        console.error('Failed to seed official categories:', err);
        process.exitCode = 1;
    }
    finally {
        await (0, client_1.closeDbPool)();
    }
}
if (require.main === module || !process.env.TEST_ENV) {
    run();
}
