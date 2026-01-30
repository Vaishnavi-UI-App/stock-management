const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// ==================== USER ROUTES ====================

// Get all users
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'desc' }
    });
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { ...userData, password: hashedPassword },
      include: { branch: true }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...userData } = req.body;

    const updateData = { ...userData };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { branch: true }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BRANCH ROUTES ====================

// Get all branches
app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: { manager: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create branch
app.post('/api/branches', authMiddleware, async (req, res) => {
  try {
    const branch = await prisma.branch.create({
      data: req.body,
      include: { manager: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update branch
app.put('/api/branches/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.update({
      where: { id },
      data: req.body,
      include: { manager: { select: { id: true, name: true, email: true } } }
    });
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete branch
app.delete('/api/branches/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.branch.delete({ where: { id } });
    res.json({ message: 'Branch deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: req.body
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPANY STOCK ROUTES ====================

// Get company stock
app.get('/api/company-stock', authMiddleware, async (req, res) => {
  try {
    const stock = await prisma.companyStock.findMany({
      include: { product: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update company stock
app.put('/api/company-stock/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const stock = await prisma.companyStock.upsert({
      where: { productId },
      update: { quantity, lastUpdated: new Date() },
      create: { productId, quantity },
      include: { product: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BRANCH STOCK ROUTES ====================

// Get branch stock
app.get('/api/branch-stock', authMiddleware, async (req, res) => {
  try {
    const { branchId } = req.query;
    const where = branchId ? { branchId } : {};

    const stock = await prisma.branchStock.findMany({
      where,
      include: { product: true, branch: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update branch stock
app.put('/api/branch-stock', authMiddleware, async (req, res) => {
  try {
    const { branchId, productId, quantity } = req.body;

    const stock = await prisma.branchStock.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: { quantity, lastUpdated: new Date() },
      create: { branchId, productId, quantity },
      include: { product: true, branch: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALESMAN STOCK ROUTES ====================

// Get salesman stock
app.get('/api/salesman-stock', authMiddleware, async (req, res) => {
  try {
    const { salesmanId } = req.query;
    const where = salesmanId ? { salesmanId } : {};

    const stock = await prisma.salesmanStock.findMany({
      where,
      include: { product: true, salesman: { select: { id: true, name: true } }, branch: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Take stock (salesman takes from branch)
app.post('/api/salesman-stock/take', authMiddleware, async (req, res) => {
  try {
    const { salesmanId, branchId, productId, quantity } = req.body;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check branch stock
      const branchStock = await tx.branchStock.findUnique({
        where: { branchId_productId: { branchId, productId } }
      });

      if (!branchStock || branchStock.quantity < quantity) {
        throw new Error('Insufficient branch stock');
      }

      // Reduce branch stock
      await tx.branchStock.update({
        where: { branchId_productId: { branchId, productId } },
        data: { quantity: branchStock.quantity - quantity, lastUpdated: new Date() }
      });

      // Add to salesman stock
      const salesmanStock = await tx.salesmanStock.upsert({
        where: { salesmanId_productId: { salesmanId, productId } },
        update: { quantity: { increment: quantity }, takenDate: new Date() },
        create: { salesmanId, branchId, productId, quantity },
        include: { product: true }
      });

      return salesmanStock;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return stock (salesman returns to branch)
app.post('/api/salesman-stock/return', authMiddleware, async (req, res) => {
  try {
    const { salesmanId, branchId, productId, quantity } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Check salesman stock
      const salesmanStock = await tx.salesmanStock.findUnique({
        where: { salesmanId_productId: { salesmanId, productId } }
      });

      if (!salesmanStock || salesmanStock.quantity < quantity) {
        throw new Error('Insufficient salesman stock');
      }

      // Reduce salesman stock
      if (salesmanStock.quantity === quantity) {
        await tx.salesmanStock.delete({
          where: { salesmanId_productId: { salesmanId, productId } }
        });
      } else {
        await tx.salesmanStock.update({
          where: { salesmanId_productId: { salesmanId, productId } },
          data: { quantity: salesmanStock.quantity - quantity }
        });
      }

      // Add to branch stock
      await tx.branchStock.upsert({
        where: { branchId_productId: { branchId, productId } },
        update: { quantity: { increment: quantity }, lastUpdated: new Date() },
        create: { branchId, productId, quantity }
      });

      return { message: 'Stock returned successfully' };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STOCK TRANSFER ROUTES ====================

// Transfer stock from company to branch
app.post('/api/stock-transfer/to-branch', authMiddleware, async (req, res) => {
  try {
    const { productId, toBranchId, quantity, transferredBy } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Check company stock
      const companyStock = await tx.companyStock.findUnique({
        where: { productId }
      });

      if (!companyStock || companyStock.quantity < quantity) {
        throw new Error('Insufficient company stock');
      }

      // Reduce company stock
      await tx.companyStock.update({
        where: { productId },
        data: { quantity: companyStock.quantity - quantity, lastUpdated: new Date() }
      });

      // Add to branch stock
      await tx.branchStock.upsert({
        where: { branchId_productId: { branchId: toBranchId, productId } },
        update: { quantity: { increment: quantity }, lastUpdated: new Date() },
        create: { branchId: toBranchId, productId, quantity }
      });

      // Create transfer record
      const transfer = await tx.stockTransfer.create({
        data: {
          productId,
          toBranchId,
          quantity,
          transferredBy,
          status: 'completed'
        },
        include: { product: true }
      });

      return transfer;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer stock from branch to branch
app.post('/api/stock-transfer/branch-to-branch', authMiddleware, async (req, res) => {
  try {
    const { productId, fromBranchId, toBranchId, quantity, transferredBy } = req.body;

    if (fromBranchId === toBranchId) {
      return res.status(400).json({ error: 'Source and destination branches cannot be the same' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check source branch stock
      const fromBranchStock = await tx.branchStock.findUnique({
        where: { branchId_productId: { branchId: fromBranchId, productId } }
      });

      if (!fromBranchStock || fromBranchStock.quantity < quantity) {
        throw new Error('Insufficient stock in source branch');
      }

      // Reduce source branch stock
      await tx.branchStock.update({
        where: { branchId_productId: { branchId: fromBranchId, productId } },
        data: { quantity: fromBranchStock.quantity - quantity, lastUpdated: new Date() }
      });

      // Add to destination branch stock
      await tx.branchStock.upsert({
        where: { branchId_productId: { branchId: toBranchId, productId } },
        update: { quantity: { increment: quantity }, lastUpdated: new Date() },
        create: { branchId: toBranchId, productId, quantity }
      });

      // Create transfer record
      const transfer = await tx.stockTransfer.create({
        data: {
          productId,
          fromBranchId,
          toBranchId,
          quantity,
          transferredBy,
          status: 'completed'
        },
        include: { product: true, fromBranch: true }
      });

      // Get updated stock levels for both branches
      const updatedFromStock = await tx.branchStock.findUnique({
        where: { branchId_productId: { branchId: fromBranchId, productId } },
        include: { branch: true }
      });
      const updatedToStock = await tx.branchStock.findUnique({
        where: { branchId_productId: { branchId: toBranchId, productId } },
        include: { branch: true }
      });

      return {
        transfer,
        fromBranchStock: updatedFromStock,
        toBranchStock: updatedToStock
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock transfer history
app.get('/api/stock-transfers', authMiddleware, async (req, res) => {
  try {
    const { branchId, productId } = req.query;
    const where = {};
    if (branchId) {
      where.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ];
    }
    if (productId) where.productId = productId;

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        product: true,
        fromBranch: true,
        transferredByUser: { select: { id: true, name: true } }
      },
      orderBy: { transferDate: 'desc' }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALES ROUTES ====================

// Get all sales
app.get('/api/sales', authMiddleware, async (req, res) => {
  try {
    const { salesmanId, branchId } = req.query;
    const where = {};
    if (salesmanId) where.salesmanId = salesmanId;
    if (branchId) where.branchId = branchId;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create sale
app.post('/api/sales', authMiddleware, async (req, res) => {
  try {
    const { items, amountPaid = 0, ...saleData } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Generate bill number
      const lastSale = await tx.sale.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      const billNumber = `INV-${String((lastSale ? parseInt(lastSale.billNumber.split('-')[1]) : 0) + 1).padStart(6, '0')}`;

      // Find or create customer by phone
      let customer = null;
      if (saleData.customerPhone) {
        customer = await tx.customer.findUnique({
          where: { phone: saleData.customerPhone }
        });

        if (!customer) {
          // Create new customer
          customer = await tx.customer.create({
            data: {
              name: saleData.customerName,
              phone: saleData.customerPhone,
              email: saleData.customerEmail || null,
              address: saleData.customerAddress || null,
              gstin: saleData.customerGSTIN || null,
              pan: saleData.customerPAN || null
            }
          });
        }
      }

      // Calculate payment status
      const finalAmount = saleData.finalAmount;
      const balanceDue = finalAmount - amountPaid;
      let paymentStatus = 'unpaid';
      if (balanceDue <= 0) {
        paymentStatus = 'paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'partial';
      }

      // Create sale with items
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          billNumber,
          customerId: customer?.id || null,
          amountPaid,
          balanceDue: Math.max(0, balanceDue),
          paymentStatus,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              hsnCode: item.hsnCode,
              batchNo: item.batchNo,
              expDate: item.expDate,
              mfgDate: item.mfgDate,
              unit: item.unit
            }))
          }
        },
        include: {
          items: { include: { product: true } },
          salesman: { select: { id: true, name: true } },
          branch: true,
          customer: true
        }
      });

      // Update customer ledger if customer exists
      if (customer) {
        // Add sale amount to customer balance (they owe us)
        const newBalance = customer.currentBalance + finalAmount - amountPaid;

        // Create transaction for sale
        await tx.customerTransaction.create({
          data: {
            customerId: customer.id,
            saleId: sale.id,
            type: 'sale',
            amount: finalAmount,
            balanceAfter: customer.currentBalance + finalAmount,
            description: `Invoice ${billNumber}`
          }
        });

        // If payment was made, create payment transaction
        if (amountPaid > 0) {
          const payment = await tx.payment.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              amount: amountPaid,
              paymentMethod: saleData.paymentMethod,
              receivedBy: req.user.id
            }
          });

          await tx.customerTransaction.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              paymentId: payment.id,
              type: 'payment',
              amount: amountPaid,
              balanceAfter: newBalance,
              description: `Payment for Invoice ${billNumber}`
            }
          });
        }

        // Update customer balance and totals
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            currentBalance: newBalance,
            totalPurchases: { increment: finalAmount },
            totalPaid: { increment: amountPaid }
          }
        });
      }

      // Reduce salesman stock for each item
      for (const item of items) {
        const salesmanStock = await tx.salesmanStock.findUnique({
          where: { salesmanId_productId: { salesmanId: saleData.salesmanId, productId: item.productId } }
        });

        if (salesmanStock) {
          if (salesmanStock.quantity <= item.quantity) {
            await tx.salesmanStock.delete({
              where: { salesmanId_productId: { salesmanId: saleData.salesmanId, productId: item.productId } }
            });
          } else {
            await tx.salesmanStock.update({
              where: { salesmanId_productId: { salesmanId: saleData.salesmanId, productId: item.productId } },
              data: { quantity: salesmanStock.quantity - item.quantity }
            });
          }
        }
      }

      return sale;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sale by ID
app.get('/api/sales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending sales for approval (Admin only)
app.get('/api/sales/pending/all', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view pending bills' });
    }

    const sales = await prisma.sale.findMany({
      where: { status: 'pending' },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true, email: true } },
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve sale (Admin only)
app.put('/api/sales/:id/approve', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can approve bills' });
    }

    const { id } = req.params;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject sale (Admin only)
app.put('/api/sales/:id/reject', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can reject bills' });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sale (Admin can edit pending bills)
app.put('/api/sales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...saleData } = req.body;

    // Get existing sale
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Only allow editing pending sales
    if (existingSale.status !== 'pending' && req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Cannot edit approved/rejected sales' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.saleItem.deleteMany({
        where: { saleId: id }
      });

      // Update sale with new items
      const sale = await tx.sale.update({
        where: { id },
        data: {
          ...saleData,
          items: items ? {
            create: items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              hsnCode: item.hsnCode,
              batchNo: item.batchNo,
              expDate: item.expDate,
              mfgDate: item.mfgDate,
              unit: item.unit
            }))
          } : undefined
        },
        include: {
          items: { include: { product: true } },
          salesman: { select: { id: true, name: true } },
          branch: true
        }
      });

      return sale;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER ROUTES ====================

// Get all customers
app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID with transactions
app.get('/api/customers/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by phone
app.get('/api/customers/phone/:phone', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { phone }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
app.post('/api/customers', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.create({
      data: req.body
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
app.put('/api/customers/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.update({
      where: { id },
      data: req.body
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer ledger (transactions)
app.get('/api/customers/:id/ledger', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where = { customerId: id };
    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const transactions = await prisma.customerTransaction.findMany({
      where,
      include: {
        sale: { select: { billNumber: true, amountPaid: true, balanceDue: true, finalAmount: true } },
        payment: { select: { paymentMethod: true, referenceNo: true } }
      },
      orderBy: { transactionDate: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customers with outstanding balance
app.get('/api/customers/outstanding/all', authMiddleware, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        currentBalance: { gt: 0 }
      },
      orderBy: { currentBalance: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customers with advance balance (negative = we owe them)
app.get('/api/customers/advance/all', authMiddleware, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        currentBalance: { lt: 0 }
      },
      orderBy: { currentBalance: 'asc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT ROUTES ====================

// Get all payments
app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const where = {};
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        sale: { select: { id: true, billNumber: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record payment
app.post('/api/payments', authMiddleware, async (req, res) => {
  try {
    const { customerId, saleId, amount, paymentMethod, referenceNo, notes, isAdvance } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Get customer
      const customer = await tx.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate new balance
      const newBalance = customer.currentBalance - amount;

      // Create payment
      const payment = await tx.payment.create({
        data: {
          customerId,
          saleId: saleId || null,
          amount,
          paymentMethod,
          referenceNo,
          notes,
          receivedBy: req.user.id
        }
      });

      // Create transaction record
      await tx.customerTransaction.create({
        data: {
          customerId,
          saleId: saleId || null,
          paymentId: payment.id,
          type: isAdvance ? 'advance' : 'payment',
          amount: amount,
          balanceAfter: newBalance,
          description: isAdvance
            ? `Advance payment received - ${paymentMethod}`
            : `Payment received - ${paymentMethod}${referenceNo ? ` (Ref: ${referenceNo})` : ''}`
        }
      });

      // Update customer balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: newBalance,
          totalPaid: { increment: amount }
        }
      });

      // If payment is for a specific sale, update sale payment status
      if (saleId) {
        const sale = await tx.sale.findUnique({ where: { id: saleId } });
        if (sale) {
          const newAmountPaid = sale.amountPaid + amount;
          const newBalanceDue = sale.finalAmount - newAmountPaid;
          let paymentStatus = 'unpaid';
          if (newBalanceDue <= 0) {
            paymentStatus = 'paid';
          } else if (newAmountPaid > 0) {
            paymentStatus = 'partial';
          }

          await tx.sale.update({
            where: { id: saleId },
            data: {
              amountPaid: newAmountPaid,
              balanceDue: Math.max(0, newBalanceDue),
              paymentStatus
            }
          });
        }
      }

      return payment;
    });

    // Fetch complete payment with relations
    const completePayment = await prisma.payment.findUnique({
      where: { id: result.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, currentBalance: true } },
        sale: { select: { id: true, billNumber: true } }
      }
    });

    res.status(201).json(completePayment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment summary/dashboard stats
app.get('/api/payments/summary', authMiddleware, async (req, res) => {
  try {
    // Total outstanding (customers who owe us)
    const outstandingResult = await prisma.customer.aggregate({
      _sum: { currentBalance: true },
      where: { currentBalance: { gt: 0 } }
    });

    // Total advance (we owe customers)
    const advanceResult = await prisma.customer.aggregate({
      _sum: { currentBalance: true },
      where: { currentBalance: { lt: 0 } }
    });

    // Customers with outstanding
    const customersWithOutstanding = await prisma.customer.count({
      where: { currentBalance: { gt: 0 } }
    });

    // Customers with advance
    const customersWithAdvance = await prisma.customer.count({
      where: { currentBalance: { lt: 0 } }
    });

    // Today's collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: today }
      }
    });

    res.json({
      totalOutstanding: outstandingResult._sum.currentBalance || 0,
      totalAdvance: Math.abs(advanceResult._sum.currentBalance || 0),
      customersWithOutstanding,
      customersWithAdvance,
      todayCollections: todayPayments._sum.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ROUTES (Purchase Invoice) ====================

// Get all orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { salesmanId, branchId, orderStatus } = req.query;
    const where = {};
    if (salesmanId) where.salesmanId = salesmanId;
    if (branchId) where.branchId = branchId;
    if (orderStatus) where.orderStatus = orderStatus;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending orders for approval (Admin only)
app.get('/api/orders/pending/all', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view pending orders' });
    }

    const orders = await prisma.order.findMany({
      where: { orderStatus: 'pending' },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true, email: true } },
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order (Purchase Invoice)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, amountPaid = 0, ...orderData } = req.body;

    // Generate order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const orderNumber = `PO-${String((lastOrder ? parseInt(lastOrder.orderNumber.split('-')[1]) : 0) + 1).padStart(6, '0')}`;

    // Calculate payment status
    const finalAmount = orderData.finalAmount || 0;
    const balanceDue = Math.max(0, finalAmount - amountPaid);
    let paymentStatus = 'unpaid';
    if (balanceDue <= 0) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        ...orderData,
        orderNumber,
        amountPaid,
        balanceDue,
        paymentStatus,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            hsnCode: item.hsnCode,
            batchNo: item.batchNo,
            expDate: item.expDate,
            mfgDate: item.mfgDate,
            unit: item.unit,
            availability: item.availability || 'available'
          }))
        }
      },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...orderData } = req.body;

    // Get existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow editing pending orders
    if (existingOrder.orderStatus !== 'pending' && req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Cannot edit approved/rejected orders' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });

      // Update order with new items
      const order = await tx.order.update({
        where: { id },
        data: {
          ...orderData,
          items: items ? {
            create: items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              hsnCode: item.hsnCode,
              batchNo: item.batchNo,
              expDate: item.expDate,
              mfgDate: item.mfgDate,
              unit: item.unit,
              availability: item.availability || 'available'
            }))
          } : undefined
        },
        include: {
          items: { include: { product: true } },
          salesman: { select: { id: true, name: true } },
          branch: true
        }
      });

      return order;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve order (Admin only) - Converts to Tax Invoice/Sale
app.put('/api/orders/:id/approve', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can approve orders' });
    }

    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // Get order with items
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.orderStatus !== 'pending') {
        throw new Error('Order is not pending');
      }

      // Generate bill number for the sale
      const lastSale = await tx.sale.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      const billNumber = `INV-${String((lastSale ? parseInt(lastSale.billNumber.split('-')[1]) : 0) + 1).padStart(6, '0')}`;

      // Find or create customer by phone
      let customer = null;
      if (order.customerPhone) {
        customer = await tx.customer.findUnique({
          where: { phone: order.customerPhone }
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: order.customerName,
              phone: order.customerPhone,
              email: order.customerEmail || null,
              address: order.customerAddress || null,
              gstin: order.customerGSTIN || null,
              pan: order.customerPAN || null
            }
          });
        }
      }

      // Create sale from order with payment info carried over
      const sale = await tx.sale.create({
        data: {
          billNumber,
          salesmanId: order.salesmanId,
          branchId: order.branchId,
          customerId: customer?.id || null,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress,
          customerGSTIN: order.customerGSTIN,
          customerPAN: order.customerPAN,
          totalAmount: order.totalAmount,
          discount: order.discount,
          finalAmount: order.finalAmount,
          amountPaid: order.amountPaid || 0,
          balanceDue: order.balanceDue || order.finalAmount,
          paymentStatus: order.paymentStatus || 'unpaid',
          cgstRate: order.cgstRate,
          sgstRate: order.sgstRate,
          paymentMethod: order.paymentMethod,
          status: 'approved',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          deliveryNote: order.deliveryNote,
          modeOfPayment: order.modeOfPayment,
          referenceNo: order.referenceNo,
          otherReferences: order.otherReferences,
          buyersOrderNo: order.buyersOrderNo,
          buyersOrderDate: order.buyersOrderDate,
          dispatchDocNo: order.dispatchDocNo,
          deliveryNoteDate: order.deliveryNoteDate,
          dispatchedThrough: order.dispatchedThrough,
          destination: order.destination,
          poNumber: order.poNumber,
          vehicleNo: order.vehicleNo,
          items: {
            create: order.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              hsnCode: item.hsnCode,
              batchNo: item.batchNo,
              expDate: item.expDate,
              mfgDate: item.mfgDate,
              unit: item.unit
            }))
          }
        }
      });

      // Update customer ledger if customer exists
      if (customer) {
        const amountPaid = order.amountPaid || 0;
        const balanceToAdd = order.finalAmount - amountPaid;
        const newBalance = customer.currentBalance + balanceToAdd;

        // Create transaction for sale
        await tx.customerTransaction.create({
          data: {
            customerId: customer.id,
            saleId: sale.id,
            type: 'sale',
            amount: order.finalAmount,
            balanceAfter: customer.currentBalance + order.finalAmount,
            description: `Invoice ${billNumber} (from Order ${order.orderNumber})`
          }
        });

        // If payment was made with the order, create payment transaction
        if (amountPaid > 0) {
          const payment = await tx.payment.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              amount: amountPaid,
              paymentMethod: order.paymentMethod,
              receivedBy: req.user.id,
              notes: `Payment with Order ${order.orderNumber}`
            }
          });

          await tx.customerTransaction.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              paymentId: payment.id,
              type: 'payment',
              amount: amountPaid,
              balanceAfter: newBalance,
              description: `Payment for Invoice ${billNumber}`
            }
          });
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            currentBalance: newBalance,
            totalPurchases: { increment: order.finalAmount },
            totalPaid: { increment: amountPaid }
          }
        });
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          orderStatus: 'converted',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          convertedSaleId: sale.id
        },
        include: {
          items: { include: { product: true } },
          salesman: { select: { id: true, name: true } },
          branch: true
        }
      });

      return { order: updatedOrder, sale };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject order (Admin only)
app.put('/api/orders/:id/reject', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager (admin)
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can reject orders' });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        items: { include: { product: true } },
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order (only pending orders can be deleted)
app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderStatus !== 'pending' && req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Cannot delete non-pending orders' });
    }

    await prisma.order.delete({ where: { id } });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPENDITURE ROUTES ====================

// IMPORTANT: Specific routes MUST come before :id routes

// Get pending expenditures (Admin only)
app.get('/api/expenditures/pending/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view pending expenditures' });
    }

    const expenditures = await prisma.expenditure.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenditures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenditure summary (Admin only)
app.get('/api/expenditures/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view summary' });
    }

    const { userId, month, year } = req.query;
    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    // Get totals by status
    const [pending, approved, rejected] = await Promise.all([
      prisma.expenditure.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { ...where, status: 'pending' }
      }),
      prisma.expenditure.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { ...where, status: 'approved' }
      }),
      prisma.expenditure.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { ...where, status: 'rejected' }
      })
    ]);

    res.json({
      pending: {
        count: pending._count,
        amount: pending._sum.amount || 0
      },
      approved: {
        count: approved._count,
        amount: approved._sum.amount || 0
      },
      rejected: {
        count: rejected._count,
        amount: rejected._sum.amount || 0
      },
      total: {
        count: pending._count + approved._count + rejected._count,
        amount: (pending._sum.amount || 0) + (approved._sum.amount || 0) + (rejected._sum.amount || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all expenditures (Admin sees all, Salesman sees own)
app.get('/api/expenditures', authMiddleware, async (req, res) => {
  try {
    const { userId, status, month, year } = req.query;
    const where = {};

    // Non-admin users can only see their own expenditures
    if (req.user.role !== 'stock_manager') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const expenditures = await prisma.expenditure.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenditures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenditure by ID
app.get('/api/expenditures/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const expenditure = await prisma.expenditure.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    if (!expenditure) {
      return res.status(404).json({ error: 'Expenditure not found' });
    }

    // Non-admin can only view their own expenditures
    if (req.user.role !== 'stock_manager' && expenditure.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create expenditure (Salesman)
app.post('/api/expenditures', authMiddleware, async (req, res) => {
  try {
    const { date, description, amount, evidenceFile, evidenceType, evidenceName } = req.body;

    const expenditure = await prisma.expenditure.create({
      data: {
        userId: req.user.id,
        date: new Date(date),
        description,
        amount,
        evidenceFile,
        evidenceType,
        evidenceName
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.status(201).json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expenditure (only pending, by owner)
app.put('/api/expenditures/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description, amount, evidenceFile, evidenceType, evidenceName } = req.body;

    const existing = await prisma.expenditure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expenditure not found' });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot edit other user\'s expenditure' });
    }

    if (existing.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot edit approved/rejected expenditure' });
    }

    const expenditure = await prisma.expenditure.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        amount,
        evidenceFile,
        evidenceType,
        evidenceName
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expenditure (only pending, by owner)
app.delete('/api/expenditures/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.expenditure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expenditure not found' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Cannot delete other user\'s expenditure' });
    }

    if (existing.status !== 'pending' && req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Cannot delete approved/rejected expenditure' });
    }

    await prisma.expenditure.delete({ where: { id } });
    res.json({ message: 'Expenditure deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve expenditure (Admin only)
app.put('/api/expenditures/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can approve expenditures' });
    }

    const { id } = req.params;

    const expenditure = await prisma.expenditure.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject expenditure (Admin only)
app.put('/api/expenditures/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can reject expenditures' });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const expenditure = await prisma.expenditure.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTS ====================

// Sales report
app.get('/api/reports/sales', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, branchId, salesmanId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (branchId) where.branchId = branchId;
    if (salesmanId) where.salesmanId = salesmanId;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: true,
        salesman: { select: { id: true, name: true } },
        branch: true
      }
    });

    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);

    res.json({
      totalSales,
      totalAmount,
      sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORGANIZATION MASTER ROUTES ====================

// Get organization details
app.get('/api/organization', authMiddleware, async (req, res) => {
  try {
    const org = await prisma.organization.findFirst({
      include: { documents: true }
    });
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update organization
app.post('/api/organization', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can manage organization' });
    }

    const existing = await prisma.organization.findFirst();

    let org;
    if (existing) {
      org = await prisma.organization.update({
        where: { id: existing.id },
        data: req.body,
        include: { documents: true }
      });
    } else {
      org = await prisma.organization.create({
        data: req.body,
        include: { documents: true }
      });
    }

    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload organization document
app.post('/api/organization/:orgId/documents', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can upload documents' });
    }

    const { orgId } = req.params;
    const { documentName, documentType, fileData, fileName, fileType } = req.body;

    const doc = await prisma.organizationDocument.create({
      data: {
        organizationId: orgId,
        documentName,
        documentType,
        fileData,
        fileName,
        fileType,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete organization document
app.delete('/api/organization/documents/:docId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can delete documents' });
    }

    const { docId } = req.params;
    await prisma.organizationDocument.delete({ where: { id: docId } });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ATTENDANCE ROUTES ====================

// Check-in
app.post('/api/attendance/check-in', authMiddleware, async (req, res) => {
  try {
    const { photo, location, device } = req.body;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
    const today = new Date(todayStr);
    const endOfDay = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999Z`);

    // Check if already checked in today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lte: endOfDay
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    // Get IP from request
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';

    const attendance = await prisma.attendance.create({
      data: {
        userId: req.user.id,
        date: today,
        checkInTime: new Date(),
        checkInIp: typeof ip === 'string' ? ip : '',
        checkInDevice: device || '',
        checkInLocation: location || '',
        checkInPhoto: photo || null,
        status: 'present',
        approvalStatus: 'pending'
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check-out
app.post('/api/attendance/check-out', authMiddleware, async (req, res) => {
  try {
    const { photo, location, device } = req.body;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
    const today = new Date(todayStr);
    const endOfDay = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999Z`);

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lte: endOfDay
        }
      }
    });

    if (!existing) {
      return res.status(400).json({ error: 'Not checked in today' });
    }

    if (existing.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';
    const checkOutTime = new Date();

    // Calculate total hours
    const checkInTime = new Date(existing.checkInTime);
    const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    // Determine status based on hours
    let status = 'present';
    if (totalHours < 4) {
      status = 'half_day';
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime,
        checkOutIp: typeof ip === 'string' ? ip : '',
        checkOutDevice: device || '',
        checkOutLocation: location || '',
        checkOutPhoto: photo || null,
        totalHours: parseFloat(totalHours.toFixed(2)),
        status
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's attendance for current user
app.get('/api/attendance/today', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const startOfDay = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`);
    const endOfDay = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999Z`);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    res.json(attendance || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my attendance history
app.get('/api/attendance/my-history', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { userId: req.user.id };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all attendance (Admin)
app.get('/api/attendance/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view all attendance' });
    }

    const { userId, date, month, year, approvalStatus } = req.query;
    const where = {};

    if (userId) where.userId = userId;
    if (approvalStatus) where.approvalStatus = approvalStatus;

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, role: true, profilePhoto: true } }
      },
      orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }]
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending attendance approvals (Admin)
app.get('/api/attendance/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view pending attendance' });
    }

    const attendance = await prisma.attendance.findMany({
      where: { approvalStatus: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, role: true, profilePhoto: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve attendance (Admin)
app.put('/api/attendance/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can approve attendance' });
    }

    const { id } = req.params;
    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject attendance (Admin)
app.put('/api/attendance/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can reject attendance' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: notes || 'Rejected by admin'
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } }
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance summary (Admin)
app.get('/api/attendance/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view summary' });
    }

    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const [present, absent, halfDay, late, pending] = await Promise.all([
      prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status: 'present' } }),
      prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status: 'absent' } }),
      prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status: 'half_day' } }),
      prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status: 'late' } }),
      prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, approvalStatus: 'pending' } })
    ]);

    // Get today's attendance count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPresent = await prisma.attendance.count({
      where: { date: today }
    });
    const totalUsers = await prisma.user.count();

    res.json({
      present,
      absent,
      halfDay,
      late,
      pending,
      todayPresent,
      totalUsers,
      month: m,
      year: y
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
