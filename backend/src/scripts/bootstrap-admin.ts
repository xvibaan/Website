import dotenv from 'dotenv';
dotenv.config();

import { eq } from 'drizzle-orm';
import { getDb, closeDbPool } from '../db/client';
import { userRepository } from '../db/repositories/user.repository';
import { users } from '../db/schema/users';
import { PasswordService } from '../auth/password.service';

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

    const db = getDb();
    
    // Check if an admin already exists
    const existingAdmins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    
    if (existingAdmins.length > 0) {
      console.log('An admin user already exists. Aborting bootstrap.');
      return;
    }

    // Check if the specific email already exists as a non-admin
    const existingUser = await userRepository.findByEmail(adminEmail);
    if (existingUser) {
      console.error('ERROR: A user with this email already exists but is not an admin. Aborting.');
      process.exit(1);
    }

    const passwordHash = await PasswordService.hash(adminPassword);

    await userRepository.create({
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'admin',
    });

    console.log('Successfully created the first admin user.');

  } catch (err) {
    const existingAdmins = await getDb().select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (existingAdmins.length > 0) { console.log('An admin user already exists. Aborting bootstrap.'); return; } console.error('ERROR during bootstrap:', err); process.exit(1);
  } finally {
    await closeDbPool();
  }
}

bootstrap();
