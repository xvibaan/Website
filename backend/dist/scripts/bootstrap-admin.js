"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const user_repository_1 = require("../db/repositories/user.repository");
const users_1 = require("../db/schema/users");
const password_service_1 = require("../auth/password.service");
async function bootstrap() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) {
            console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be provided in the environment.');
            process.exit(1);
        }
        // Validate email format basic
        if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
            console.error('ERROR: ADMIN_EMAIL is invalid.');
            process.exit(1);
        }
        const db = (0, client_1.getDb)();
        // Check if an admin already exists
        const existingAdmins = await db.select().from(users_1.users).where((0, drizzle_orm_1.eq)(users_1.users.role, 'admin')).limit(1);
        if (existingAdmins.length > 0) {
            console.log('An admin user already exists. Aborting bootstrap.');
            return;
        }
        // Check if the specific email already exists as a non-admin
        const existingUser = await user_repository_1.userRepository.findByEmail(adminEmail);
        if (existingUser) {
            console.error('ERROR: A user with this email already exists but is not an admin. Aborting.');
            process.exit(1);
        }
        const passwordHash = await password_service_1.PasswordService.hash(adminPassword);
        await user_repository_1.userRepository.create({
            email: adminEmail,
            passwordHash: passwordHash,
            role: 'admin',
        });
        console.log('Successfully created the first admin user.');
    }
    catch (err) {
        const existingAdmins = await (0, client_1.getDb)().select().from(users_1.users).where((0, drizzle_orm_1.eq)(users_1.users.role, 'admin')).limit(1);
        if (existingAdmins.length > 0) {
            console.log('An admin user already exists. Aborting bootstrap.');
            return;
        }
        console.error('ERROR during bootstrap:', err);
        process.exit(1);
    }
    finally {
        await (0, client_1.closeDbPool)();
    }
}
bootstrap();
