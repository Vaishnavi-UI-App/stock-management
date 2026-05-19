// One-off helper: list all users and ensure an admin account exists with a
// known password. Run with:  node prisma/reset-admin.js
//
// It will:
//   1. List every user in the DB (email, role)
//   2. Upsert admin@local.com / Admin123! as a stock_manager (creates if
//      missing, resets the password if it already exists).
//
// Use it when you've forgotten the seed credentials or the seeded users
// were never created.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@local.com';
const ADMIN_PASSWORD = 'Admin123!';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nExisting users (${users.length}):`);
  if (users.length === 0) {
    console.log('  (none)');
  } else {
    users.forEach(u => console.log(`  - ${u.email.padEnd(30)} ${u.role.padEnd(18)} ${u.name}`));
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { password: hashed, role: 'stock_manager' },
    });
    console.log(`\nReset password for ${ADMIN_EMAIL}`);
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashed,
        name: 'Local Admin',
        role: 'stock_manager',
        phone: '9999999999',
      },
    });
    console.log(`\nCreated new admin ${ADMIN_EMAIL}`);
  }

  console.log('\n========================================');
  console.log(`  Login:     ${ADMIN_EMAIL}`);
  console.log(`  Password:  ${ADMIN_PASSWORD}`);
  console.log('========================================\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
