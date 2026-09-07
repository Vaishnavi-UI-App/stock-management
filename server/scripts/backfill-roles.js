// One-off migration script for the RBAC rollout (Phase 2).
//
// Run once, after the additive schema change (Role table + User.roleId) is
// live, and before deploying the new permission-checking backend code:
//
//   node scripts/backfill-roles.js
//   (or, against the live container: docker exec dynamic-backend node scripts/backfill-roles.js)
//
// What it does, inside a single transaction:
//   1. Upserts a full-access "Administrator" role (isSystem: true).
//   2. Assigns that role to every existing user whose legacy `role` column is
//      'stock_manager'.
//   3. Leaves every other existing user with roleId = NULL — intentional; see
//      the RBAC plan. They cannot use the app until an admin creates roles and
//      reassigns them via the new Role Management page's bulk-assign panel.
//   4. Prints a summary, including the full list of now-unassigned users, so
//      whoever runs this has an immediate punch list.
//
// Idempotent: safe to re-run (upserts the role by name, only updates users
// still on the legacy path).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Keep in sync with MODULE_KEYS in server/src/index.js — this script has its
// own copy since it runs standalone, outside the Express app.
const MODULE_KEYS = [
  'organization', 'products', 'companyStock',
  'users', 'roles', 'attendanceManagement', 'orders', 'expenditures',
  'customerLedger', 'accounts', 'sales', 'gstReports', 'salesReturns',
  'stockAlerts', 'payroll', 'notifications', 'expiryTracking', 'purchases',
  'leaveManagement', 'damageTracking', 'auditLog', 'routeTracking',
  'salesmanStock',
  'dealerApplication', 'paymentReceived', 'reports',
];
const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];

function fullAccessPermissions() {
  const perms = {};
  for (const module of MODULE_KEYS) {
    perms[module] = {};
    for (const action of PERMISSION_ACTIONS) perms[module][action] = true;
  }
  return perms;
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const adminRole = await tx.role.upsert({
      where: { name: 'Administrator' },
      update: {
        isSystem: true,
        dataScope: 'all',
        permissions: fullAccessPermissions(),
      },
      create: {
        name: 'Administrator',
        description: 'Full access to every module. Bootstrap role created by the RBAC migration.',
        dataScope: 'all',
        isSystem: true,
        permissions: fullAccessPermissions(),
      },
    });

    const promoted = await tx.user.updateMany({
      where: { role: 'stock_manager', roleId: null },
      data: { roleId: adminRole.id },
    });

    const unassigned = await tx.user.findMany({
      where: { roleId: null },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    return { adminRole, promotedCount: promoted.count, unassigned };
  });

  console.log('==========================================');
  console.log('RBAC backfill complete.');
  console.log(`Administrator role: ${result.adminRole.id}`);
  console.log(`Promoted to Administrator: ${result.promotedCount} user(s) (previously role='stock_manager')`);
  console.log('==========================================');
  console.log(`\nUsers left WITHOUT a role (${result.unassigned.length}) — reassign these from Role Management:`);
  if (result.unassigned.length === 0) {
    console.log('  (none)');
  } else {
    for (const u of result.unassigned) {
      console.log(`  - ${u.email.padEnd(30)} ${(u.role || 'no-legacy-role').padEnd(18)} ${u.name}`);
    }
  }
  console.log('');
}

main()
  .catch((e) => { console.error('Backfill failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
