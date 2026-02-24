const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, password: true }
    });

    console.log('Checking password hashes...\n');
    
    const testPassword = 'password123';
    
    for (const user of users) {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`${user.email}: ${isValid ? '✓ VALID' : '✗ INVALID'}`);
      console.log(`  Hash: ${user.password.substring(0, 30)}...`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
