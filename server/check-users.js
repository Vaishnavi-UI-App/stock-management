const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Connecting to database...');
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    console.log('\nUsers in database:');
    if (users.length === 0) {
      console.log('!!! NO USERS FOUND IN DATABASE !!!');
    } else {
      users.forEach(u => {
        console.log(`- ${u.email} (${u.role})`);
      });
    }
    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
