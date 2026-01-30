const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Connecting to database...');

    // Test connection
    await prisma.$connect();
    console.log('Database connected successfully!');

    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@admin.com');

      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { email: 'admin@admin.com' },
        data: { password: hashedPassword }
      });
      console.log('Password reset to: admin123');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@admin.com',
          password: hashedPassword,
          role: 'stock_manager',
          phone: '9999999999'
        }
      });

      console.log('Admin user created successfully!');
      console.log('Email: admin@admin.com');
      console.log('Password: admin123');
    }

    // List all users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });

    console.log('\nAll users in database:');
    users.forEach(u => {
      console.log(`- ${u.email} (${u.role})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'P1001') {
      console.error('Cannot connect to database. Make sure MySQL is running.');
    }
    if (error.code === 'P2021') {
      console.error('Table does not exist. Run: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
