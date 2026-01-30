const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create branches
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: 'Pune Branch',
        address: 'Pune, Maharashtra',
        phone: '020-12345678'
      }
    }),
    prisma.branch.create({
      data: {
        name: 'Mumbai Branch',
        address: 'Mumbai, Maharashtra',
        phone: '022-12345678'
      }
    }),
    prisma.branch.create({
      data: {
        name: 'Nashik Branch',
        address: 'Nashik, Maharashtra',
        phone: '0253-12345678'
      }
    })
  ]);

  console.log('Created branches:', branches.length);

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    // Stock Manager
    prisma.user.create({
      data: {
        name: 'Stock Manager',
        email: 'manager@stock.com',
        password: hashedPassword,
        role: 'stock_manager',
        phone: '9876543210'
      }
    }),
    // Branch Managers
    prisma.user.create({
      data: {
        name: 'Pune Manager',
        email: 'pune@branch.com',
        password: hashedPassword,
        role: 'branch_manager',
        phone: '9876543211',
        branchId: branches[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Mumbai Manager',
        email: 'mumbai@branch.com',
        password: hashedPassword,
        role: 'branch_manager',
        phone: '9876543212',
        branchId: branches[1].id
      }
    }),
    // Salesmen
    prisma.user.create({
      data: {
        name: 'Rajesh Sales',
        email: 'rajesh@sales.com',
        password: hashedPassword,
        role: 'salesman',
        phone: '9876543213',
        branchId: branches[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Amit Sales',
        email: 'amit@sales.com',
        password: hashedPassword,
        role: 'salesman',
        phone: '9876543214',
        branchId: branches[1].id
      }
    })
  ]);

  console.log('Created users:', users.length);

  // Create products (FERTILIZER-NUTRIX)
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: '12*61.00',
        sku: '31054000',
        category: 'Fertilizer',
        price: 185,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 12-61-00'
      }
    }),
    prisma.product.create({
      data: {
        name: '00*52*34',
        sku: '31059010',
        category: 'Fertilizer',
        price: 210,
        mrp: 340,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 00-52-34'
      }
    }),
    prisma.product.create({
      data: {
        name: '13*40*13',
        sku: '31054000',
        category: 'Fertilizer',
        price: 190,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 13-40-13'
      }
    }),
    prisma.product.create({
      data: {
        name: '11*44*11+TE',
        sku: '31054000',
        category: 'Fertilizer',
        price: 296,
        mrp: 480,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 11-44-11 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '15*15*30+TE',
        sku: '31054000',
        category: 'Fertilizer',
        price: 267,
        mrp: 560,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 15-15-30 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '14*48.00 +TE',
        sku: '31054000',
        category: 'Fertilizer',
        price: 285,
        mrp: 510,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 14-48-00 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '05*55*17+TE',
        sku: '31056000',
        category: 'Fertilizer',
        price: 294,
        mrp: 530,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 05-55-17 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '09*54*00+TE',
        sku: '31054000',
        category: 'Fertilizer',
        price: 259,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 09-54-00 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '16*08*32+TE',
        sku: '31054000',
        category: 'Fertilizer',
        price: 261,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 16-08-32 with Trace Elements'
      }
    }),
    prisma.product.create({
      data: {
        name: '17*44*00',
        sku: '31054000',
        category: 'Fertilizer',
        price: 230,
        mrp: 420,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 17-44-00'
      }
    }),
    prisma.product.create({
      data: {
        name: '00*42*47+FE (1KG)',
        sku: '31059090',
        category: 'Fertilizer',
        price: 560,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 00-42-47 with Iron (1KG)'
      }
    }),
    prisma.product.create({
      data: {
        name: '00*42*47+FE (2.5KG)',
        sku: '31059090',
        category: 'Fertilizer',
        price: 1340,
        unit: '2.5KG',
        caseQty: 6,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 00-42-47 with Iron (2.5KG)'
      }
    }),
    prisma.product.create({
      data: {
        name: 'POT.SHONITE',
        sku: '38089340',
        category: 'Fertilizer',
        price: 120,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Potassium Schoenite Fertilizer'
      }
    }),
    prisma.product.create({
      data: {
        name: '00*09*46+15TE',
        sku: '31043000',
        category: 'Fertilizer',
        price: 285,
        mrp: 530,
        unit: '1KG',
        caseQty: 15,
        gstRate: 5,
        description: 'Fertilizer-Nutrix 00-09-46 with 15% Trace Elements'
      }
    })
  ]);

  console.log('Created products:', products.length);

  // Create company stock
  for (const product of products) {
    await prisma.companyStock.create({
      data: {
        productId: product.id,
        quantity: 100
      }
    });
  }

  console.log('Created company stock for all products');

  // Create branch stock
  for (const branch of branches) {
    for (const product of products) {
      await prisma.branchStock.create({
        data: {
          branchId: branch.id,
          productId: product.id,
          quantity: 20
        }
      });
    }
  }

  console.log('Created branch stock for all branches');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
