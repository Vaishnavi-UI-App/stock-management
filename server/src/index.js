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

async function generateNextDocNumber(tx, modelName, fieldName, prefix) {
  // Get the latest record to find the highest serial number
  const rows = await tx[modelName].findMany({
    select: { [fieldName]: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  let maxSerial = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);

  for (const row of rows) {
    const val = row[fieldName];
    if (!val || typeof val !== 'string') continue;
    const match = val.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSerial) maxSerial = num;
    }
  }

  const nextSerial = maxSerial + 1;
  // Pad to at least 4 digits: INV-0001, PO-0001, etc.
  const padded = String(nextSerial).padStart(4, '0');
  return `${prefix}-${padded}`;
}

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

    // Audit log for login
    createAuditLog(user.id, 'LOGIN', 'User', user.id, null, { email: user.email }, req.ip);

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

    // Only allow known User model fields
    const allowedFields = [
      'name', 'email', 'phone', 'role', 'branchId',
      'profilePhoto', 'employeeCode', 'aadharCard', 'aadharCardDoc',
      'panCard', 'panCardDoc', 'bloodGroup', 'emergencyContact',
      'monthlySalary', 'bankName', 'bankAccountNo', 'bankAccountHolder',
      'bankIfscCode', 'bankBranchName', 'bankPassbookDoc',
      'dateOfJoining', 'pfNo', 'esicNo', 'uanNo', 'licenseNo',
      'medicalInsurance', 'designation', 'location',
      'basicSalary', 'houseRentAllowance', 'conveyanceAllowance',
      'medicalAllowance', 'uniformAllowance', 'educationAllowance',
      'ltaAllowance', 'specialAllowance', 'pfDeduction'
    ];

    const validRoles = ['stock_manager', 'account_manager', 'branch_manager', 'salesman'];

    const cleanData = {};
    for (const [key, value] of Object.entries(userData)) {
      if (!allowedFields.includes(key)) continue;
      if (value === '' || value === undefined || value === null) {
        continue; // skip empty — let DB use defaults/null
      }
      cleanData[key] = value;
    }

    // Validate role
    if (!cleanData.role || !validRoles.includes(cleanData.role)) {
      return res.status(400).json({ error: `Invalid role: ${cleanData.role || 'none'}` });
    }

    // Convert dateOfJoining string to Date if present
    if (cleanData.dateOfJoining) {
      cleanData.dateOfJoining = new Date(cleanData.dateOfJoining);
    }

    // Convert numeric fields from string if needed
    const numericFields = ['monthlySalary', 'basicSalary', 'houseRentAllowance', 'conveyanceAllowance',
      'medicalAllowance', 'uniformAllowance', 'educationAllowance', 'ltaAllowance', 'specialAllowance', 'pfDeduction'];
    for (const field of numericFields) {
      if (cleanData[field] !== undefined && cleanData[field] !== null) {
        const num = parseFloat(cleanData[field]);
        cleanData[field] = isNaN(num) ? undefined : num;
      }
    }

    const user = await prisma.user.create({
      data: { ...cleanData, password: hashedPassword },
      include: { branch: true }
    });
    const { password: _, ...userWithoutPassword } = user;

    // Audit log
    createAuditLog(req.user.id, 'CREATE', 'User', user.id, null, { name: user.name, email: user.email, role: user.role }, req.ip);

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `A user with this ${error.meta?.target?.[0] || 'value'} already exists` });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...userData } = req.body;

    // Only allow known User model fields
    const allowedFields = [
      'name', 'email', 'phone', 'role', 'branchId',
      'profilePhoto', 'employeeCode', 'aadharCard', 'aadharCardDoc',
      'panCard', 'panCardDoc', 'bloodGroup', 'emergencyContact',
      'monthlySalary', 'bankName', 'bankAccountNo', 'bankAccountHolder',
      'bankIfscCode', 'bankBranchName', 'bankPassbookDoc',
      'dateOfJoining', 'pfNo', 'esicNo', 'uanNo', 'licenseNo',
      'medicalInsurance', 'designation', 'location',
      'basicSalary', 'houseRentAllowance', 'conveyanceAllowance',
      'medicalAllowance', 'uniformAllowance', 'educationAllowance',
      'ltaAllowance', 'specialAllowance', 'pfDeduction'
    ];

    const validRoles = ['stock_manager', 'account_manager', 'branch_manager', 'salesman'];

    const cleanData = {};
    for (const [key, value] of Object.entries(userData)) {
      if (!allowedFields.includes(key)) continue;
      if (value === '' || value === undefined || value === null) {
        // For required fields skip empty, for optional set null to clear
        if (!['name', 'email', 'phone', 'role'].includes(key)) {
          cleanData[key] = null;
        }
        continue;
      }
      cleanData[key] = value;
    }

    // Validate role
    if (cleanData.role && !validRoles.includes(cleanData.role)) {
      return res.status(400).json({ error: `Invalid role: ${cleanData.role}` });
    }

    // Convert dateOfJoining string to Date if present
    if (cleanData.dateOfJoining) {
      cleanData.dateOfJoining = new Date(cleanData.dateOfJoining);
    }

    // Convert numeric fields
    const numericFields = ['monthlySalary', 'basicSalary', 'houseRentAllowance', 'conveyanceAllowance',
      'medicalAllowance', 'uniformAllowance', 'educationAllowance', 'ltaAllowance', 'specialAllowance', 'pfDeduction'];
    for (const field of numericFields) {
      if (cleanData[field] !== undefined && cleanData[field] !== null) {
        const num = parseFloat(cleanData[field]);
        cleanData[field] = isNaN(num) ? null : num;
      }
    }

    if (password) {
      cleanData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: cleanData,
      include: { branch: true }
    });
    const { password: _, ...userWithoutPassword } = user;

    // Audit log
    createAuditLog(req.user.id, 'UPDATE', 'User', id, null, { name: user.name, role: user.role }, req.ip);

    res.json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `A user with this ${error.meta?.target?.[0] || 'value'} already exists` });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });

    // Audit log
    createAuditLog(req.user.id, 'DELETE', 'User', id, null, null, req.ip);

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

    createAuditLog(req.user.id, 'CREATE', 'Branch', branch.id, null, { name: branch.name }, req.ip);

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

    createAuditLog(req.user.id, 'UPDATE', 'Branch', id, null, { name: branch.name }, req.ip);

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

    createAuditLog(req.user.id, 'DELETE', 'Branch', id, null, null, req.ip);

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
      orderBy: { createdAt: 'desc' },
      include: { batches: true }
    });
    // Flatten first batch info onto product for frontend compatibility
    const result = products.map(p => {
      const batch = p.batches && p.batches.length > 0 ? p.batches[0] : null;
      return {
        ...p,
        batchNo: batch ? batch.batchNo : null,
        mfgDate: batch ? batch.mfgDate : null
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, sku, category, price, mrp, unit, caseQty, gstRate, description, expDate, reorderPoint, batchNo, mfgDate } = req.body;
    const productData = { name, sku, category, price, unit, caseQty: caseQty || 1, gstRate: gstRate || 5 };
    if (mrp !== undefined && mrp !== null) productData.mrp = mrp;
    if (description) productData.description = description;
    if (expDate) productData.expDate = new Date(expDate);
    if (reorderPoint !== undefined) productData.reorderPoint = reorderPoint;

    const product = await prisma.product.create({ data: productData });

    // If batchNo provided, also create a ProductBatch record
    if (batchNo) {
      await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNo,
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          expDate: expDate ? new Date(expDate) : new Date(),
          quantity: 0
        }
      });
    }

    // Return product with flattened batch info
    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: { batches: true }
    });
    const batch = full.batches && full.batches.length > 0 ? full.batches[0] : null;
    const result = { ...full, batchNo: batch ? batch.batchNo : null, mfgDate: batch ? batch.mfgDate : null };

    createAuditLog(req.user.id, 'CREATE', 'Product', product.id, null, { name: product.name, sku: product.sku }, req.ip);

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, price, mrp, unit, caseQty, gstRate, description, expDate, reorderPoint, batchNo, mfgDate } = req.body;
    const productData = {};
    if (name !== undefined) productData.name = name;
    if (sku !== undefined) productData.sku = sku;
    if (category !== undefined) productData.category = category;
    if (price !== undefined) productData.price = price;
    if (mrp !== undefined) productData.mrp = mrp;
    if (unit !== undefined) productData.unit = unit;
    if (caseQty !== undefined) productData.caseQty = caseQty;
    if (gstRate !== undefined) productData.gstRate = gstRate;
    if (description !== undefined) productData.description = description;
    if (expDate !== undefined) productData.expDate = expDate ? new Date(expDate) : null;
    if (reorderPoint !== undefined) productData.reorderPoint = reorderPoint;

    const product = await prisma.product.update({
      where: { id },
      data: productData
    });

    // Update or create ProductBatch if batchNo provided
    if (batchNo) {
      const existingBatch = await prisma.productBatch.findFirst({
        where: { productId: id }
      });
      if (existingBatch) {
        await prisma.productBatch.update({
          where: { id: existingBatch.id },
          data: {
            batchNo,
            mfgDate: mfgDate ? new Date(mfgDate) : null,
            expDate: expDate ? new Date(expDate) : existingBatch.expDate
          }
        });
      } else {
        await prisma.productBatch.create({
          data: {
            productId: id,
            batchNo,
            mfgDate: mfgDate ? new Date(mfgDate) : null,
            expDate: expDate ? new Date(expDate) : new Date(),
            quantity: 0
          }
        });
      }
    }

    const full = await prisma.product.findUnique({
      where: { id },
      include: { batches: true }
    });
    const batch0 = full.batches && full.batches.length > 0 ? full.batches[0] : null;
    const result = { ...full, batchNo: batch0 ? batch0.batchNo : null, mfgDate: batch0 ? batch0.mfgDate : null };

    createAuditLog(req.user.id, 'UPDATE', 'Product', id, null, { name: product.name }, req.ip);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });

    createAuditLog(req.user.id, 'DELETE', 'Product', id, null, null, req.ip);

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
    if (req.user.role === 'branch_manager') {
      return res.status(403).json({ error: 'Branch managers must submit stock update requests for approval' });
    }
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
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

    createAuditLog(req.user.id, 'CREATE', 'StockTransfer', result.id, null, { productId, toBranchId, quantity, type: 'company-to-branch' }, req.ip);

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

    createAuditLog(req.user.id, 'CREATE', 'StockTransfer', result.transfer.id, null, { productId, fromBranchId, toBranchId, quantity, type: 'branch-to-branch' }, req.ip);

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
      // Generate serial-wise invoice number using time + sequence
      const billNumber = await generateNextDocNumber(tx, 'sale', 'billNumber', 'INV');

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

    createAuditLog(req.user.id, 'CREATE', 'Sale', result.id, null, { billNumber: result.billNumber, amount: result.finalAmount, customer: result.customerName }, req.ip);

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
    // Check if user is stock_manager or account_manager (admin)
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
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
    // Check if user is stock_manager or account_manager (admin)
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
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

    createAuditLog(req.user.id, 'APPROVE', 'Sale', id, null, { billNumber: sale.billNumber, amount: sale.finalAmount }, req.ip);

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject sale (Admin only)
app.put('/api/sales/:id/reject', authMiddleware, async (req, res) => {
  try {
    // Check if user is stock_manager or account_manager (admin)
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
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

    createAuditLog(req.user.id, 'REJECT', 'Sale', id, null, { billNumber: sale.billNumber, reason: rejectionReason }, req.ip);

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
    if (existingSale.status !== 'pending' && req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
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

// Delete sale (pending by owner/admin, any by admin)
app.delete('/api/sales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const isAdmin = req.user.role === 'stock_manager';
    const isOwner = req.user.id === existingSale.salesmanId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!isAdmin && existingSale.status !== 'pending') {
      return res.status(403).json({ error: 'Only pending sales can be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      // Restore salesman stock
      for (const item of existingSale.items) {
        await tx.salesmanStock.upsert({
          where: {
            salesmanId_productId: {
              salesmanId: existingSale.salesmanId,
              productId: item.productId
            }
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            salesmanId: existingSale.salesmanId,
            branchId: existingSale.branchId,
            productId: item.productId,
            quantity: item.quantity
          }
        });
      }

      if (existingSale.customerId) {
        await tx.customer.update({
          where: { id: existingSale.customerId },
          data: {
            currentBalance: { decrement: (existingSale.finalAmount - (existingSale.amountPaid || 0)) },
            totalPurchases: { decrement: existingSale.finalAmount },
            totalPaid: { decrement: (existingSale.amountPaid || 0) }
          }
        });
      }

      await tx.customerTransaction.deleteMany({ where: { saleId: existingSale.id } });
      await tx.payment.deleteMany({ where: { saleId: existingSale.id } });
      await tx.sale.delete({ where: { id: existingSale.id } });
    });

    createAuditLog(req.user.id, 'DELETE', 'Sale', existingSale.id, null, { billNumber: existingSale.billNumber }, req.ip);
    res.json({ message: 'Sale deleted successfully' });
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

    createAuditLog(req.user.id, 'CREATE', 'Customer', customer.id, null, { name: customer.name, phone: customer.phone }, req.ip);

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

    createAuditLog(req.user.id, 'CREATE', 'Payment', result.id, null, { customerId, amount, paymentMethod }, req.ip);

    res.status(201).json(completePayment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment (Admin only)
app.put('/api/payments/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can update payments' });
    }

    const { id } = req.params;
    const { amount, paymentMethod, referenceNo, notes, paymentDate } = req.body;

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { sale: true }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const parsedAmount = amount === undefined ? existing.amount : Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }
    const nextAmount = parsedAmount;
    const nextMethod = paymentMethod || existing.paymentMethod;

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: existing.customerId } });
      if (!customer) throw new Error('Customer not found');

      const updated = await tx.payment.update({
        where: { id },
        data: {
          amount: nextAmount,
          paymentMethod: nextMethod,
          referenceNo: referenceNo === undefined ? existing.referenceNo : referenceNo,
          notes: notes === undefined ? existing.notes : notes,
          paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate
        }
      });

      // Revert old payment effect and apply new one
      const currentBalanceAfter = customer.currentBalance + existing.amount - nextAmount;
      const totalPaidAfter = (customer.totalPaid || 0) - existing.amount + nextAmount;

      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          currentBalance: currentBalanceAfter,
          totalPaid: Math.max(0, totalPaidAfter)
        }
      });

      if (existing.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: existing.saleId } });
        if (sale) {
          const newAmountPaid = Math.max(0, (sale.amountPaid || 0) - existing.amount + nextAmount);
          const newBalanceDue = Math.max(0, sale.finalAmount - newAmountPaid);
          let paymentStatus = 'unpaid';
          if (newBalanceDue <= 0) paymentStatus = 'paid';
          else if (newAmountPaid > 0) paymentStatus = 'partial';

          await tx.sale.update({
            where: { id: existing.saleId },
            data: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              paymentStatus
            }
          });
        }
      }

      const txn = await tx.customerTransaction.findFirst({
        where: { paymentId: id }
      });
      const txnDescription = `Payment updated - ${nextMethod}${referenceNo ? ` (Ref: ${referenceNo})` : ''}`;
      if (txn) {
        await tx.customerTransaction.update({
          where: { id: txn.id },
          data: {
            amount: nextAmount,
            balanceAfter: currentBalanceAfter,
            description: txnDescription,
            transactionDate: paymentDate ? new Date(paymentDate) : txn.transactionDate
          }
        });
      } else {
        await tx.customerTransaction.create({
          data: {
            customerId: existing.customerId,
            saleId: existing.saleId || null,
            paymentId: id,
            type: 'payment',
            amount: nextAmount,
            balanceAfter: currentBalanceAfter,
            description: txnDescription,
            transactionDate: paymentDate ? new Date(paymentDate) : new Date()
          }
        });
      }

      return updated;
    });

    const complete = await prisma.payment.findUnique({
      where: { id: result.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, currentBalance: true } },
        sale: { select: { id: true, billNumber: true } }
      }
    });

    createAuditLog(req.user.id, 'UPDATE', 'Payment', id, null, { amount: nextAmount, paymentMethod: nextMethod }, req.ip);
    res.json(complete);
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
    const nowPay = new Date();
    const todayPayStr = `${nowPay.getFullYear()}-${String(nowPay.getMonth() + 1).padStart(2, '0')}-${String(nowPay.getDate()).padStart(2, '0')}`;
    const todayPay = new Date(todayPayStr + 'T00:00:00.000Z');
    const todayPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: todayPay }
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

// Get pending orders for approval (Admin + Branch Manager)
app.get('/api/orders/pending/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const where = { orderStatus: 'pending' };
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) where.branchId = managedBranchId;
    }
    const orders = await prisma.order.findMany({
      where,
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

    // Generate serial-wise purchase invoice number using time + sequence
    const orderNumber = await generateNextDocNumber(prisma, 'order', 'orderNumber', 'PO');

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

    createAuditLog(req.user.id, 'CREATE', 'Order', result.id, null, { orderNumber: result.orderNumber, amount: result.finalAmount }, req.ip);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve order (Admin + Branch Manager) - Converts to Tax Invoice/Sale
app.put('/api/orders/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const orderCheck = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!orderCheck || orderCheck.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only approve orders for your branch' });
      }
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

      // Generate serial-wise tax invoice number
      const billNumber = await generateNextDocNumber(tx, 'sale', 'billNumber', 'INV');

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

    createAuditLog(req.user.id, 'APPROVE', 'Order', req.params.id, null, { orderNumber: result.order.orderNumber, convertedSaleId: result.sale.id }, req.ip);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject order (Admin + Branch Manager)
app.put('/api/orders/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const orderCheck = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!orderCheck || orderCheck.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only reject orders for your branch' });
      }
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

    createAuditLog(req.user.id, 'REJECT', 'Order', id, null, { orderNumber: order.orderNumber, reason: rejectionReason }, req.ip);

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

// Get pending expenditures (Admin + Branch Manager)
app.get('/api/expenditures/pending/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const where = { status: 'pending' };
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = { in: branchUserIds };
      }
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

// Get expenditure summary (Admin + Branch Manager)
app.get('/api/expenditures/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userId, month, year } = req.query;
    const where = {};

    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = userId ? userId : { in: branchUserIds };
      }
    } else if (userId) {
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
    if (req.user.role === 'stock_manager' || req.user.role === 'account_manager') {
      if (userId) where.userId = userId;
    } else if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = userId ? userId : { in: branchUserIds };
      } else {
        where.userId = req.user.id;
      }
    } else {
      where.userId = req.user.id;
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
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && expenditure.userId !== req.user.id) {
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

    if (existing.userId !== req.user.id && req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Cannot delete other user\'s expenditure' });
    }

    if (existing.status !== 'pending' && req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Cannot delete approved/rejected expenditure' });
    }

    await prisma.expenditure.delete({ where: { id } });
    res.json({ message: 'Expenditure deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve expenditure (Admin + Account Manager + Branch Manager)
app.put('/api/expenditures/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const exp = await prisma.expenditure.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!exp || exp.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only approve expenditures for your branch employees' });
      }
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

    createAuditLog(req.user.id, 'APPROVE', 'Expenditure', id, null, { amount: expenditure.amount, userId: expenditure.userId }, req.ip);

    res.json(expenditure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject expenditure (Admin + Account Manager + Branch Manager)
app.put('/api/expenditures/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const exp = await prisma.expenditure.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!exp || exp.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only reject expenditures for your branch employees' });
      }
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

    createAuditLog(req.user.id, 'REJECT', 'Expenditure', id, null, { amount: expenditure.amount, reason: rejectionReason }, req.ip);

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

// Get all attendance (Admin + Account Manager + Branch Manager)
app.get('/api/attendance/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userId, date, month, year, approvalStatus } = req.query;
    const where = {};

    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = userId ? userId : { in: branchUserIds };
      }
    } else if (userId) {
      where.userId = userId;
    }

    if (approvalStatus) where.approvalStatus = approvalStatus;

    if (date) {
      const dStart = new Date(date + 'T00:00:00.000Z');
      const dEnd = new Date(dStart);
      dEnd.setUTCDate(dEnd.getUTCDate() + 1);
      where.date = { gte: dStart, lt: dEnd };
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

// Get pending attendance approvals (Admin + Account Manager + Branch Manager)
app.get('/api/attendance/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const where = { approvalStatus: 'pending' };
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = { in: branchUserIds };
      }
    }
    const attendance = await prisma.attendance.findMany({
      where,
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

// Approve attendance (Admin + Account Manager + Branch Manager)
app.put('/api/attendance/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const att = await prisma.attendance.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!att || att.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only approve attendance for your branch employees' });
      }
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

    createAuditLog(req.user.id, 'APPROVE', 'Attendance', id, null, { userId: attendance.userId }, req.ip);

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject attendance (Admin + Account Manager + Branch Manager)
app.put('/api/attendance/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const att = await prisma.attendance.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!att || att.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only reject attendance for your branch employees' });
      }
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

    createAuditLog(req.user.id, 'REJECT', 'Attendance', id, null, { userId: attendance.userId, notes }, req.ip);

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance summary (Admin + Account Manager + Branch Manager)
app.get('/api/attendance/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    // Branch manager: scope to their branch users
    let userFilter = {};
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        userFilter = { userId: { in: branchUserIds } };
      }
    }

    const [present, absent, halfDay, late, pending] = await Promise.all([
      prisma.attendance.count({ where: { ...userFilter, date: { gte: startDate, lte: endDate }, status: 'present' } }),
      prisma.attendance.count({ where: { ...userFilter, date: { gte: startDate, lte: endDate }, status: 'absent' } }),
      prisma.attendance.count({ where: { ...userFilter, date: { gte: startDate, lte: endDate }, status: 'half_day' } }),
      prisma.attendance.count({ where: { ...userFilter, date: { gte: startDate, lte: endDate }, status: 'late' } }),
      prisma.attendance.count({ where: { ...userFilter, date: { gte: startDate, lte: endDate }, approvalStatus: 'pending' } })
    ]);

    // Get today's attendance count
    const nowAtt = new Date();
    const todayAttStr = `${nowAtt.getFullYear()}-${String(nowAtt.getMonth() + 1).padStart(2, '0')}-${String(nowAtt.getDate()).padStart(2, '0')}`;
    const todayAtt = new Date(todayAttStr + 'T00:00:00.000Z');
    const nextDayAtt = new Date(todayAtt);
    nextDayAtt.setUTCDate(nextDayAtt.getUTCDate() + 1);
    const todayPresent = await prisma.attendance.count({
      where: { date: { gte: todayAtt, lt: nextDayAtt } }
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

// ==================== FEATURE 2: SALES RETURNS ====================

app.get('/api/sales-returns', authMiddleware, async (req, res) => {
  try {
    const returns = await prisma.salesReturn.findMany({
      include: { sale: true, customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(returns);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/sales-returns', authMiddleware, async (req, res) => {
  try {
    const { saleId, customerId, reason, items } = req.body;
    const totalAmount = items.reduce((s, i) => s + i.total, 0);
    const count = await prisma.salesReturn.count();
    const returnNumber = `RET-${String(count + 1).padStart(6, '0')}`;
    const result = await prisma.salesReturn.create({
      data: { returnNumber, saleId, customerId, reason, totalAmount, items: { create: items } },
      include: { items: true }
    });

    createAuditLog(req.user.id, 'CREATE', 'SalesReturn', result.id, null, { returnNumber, saleId, totalAmount }, req.ip);

    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/sales-returns/:id/approve', authMiddleware, async (req, res) => {
  try {
    const ret = await prisma.salesReturn.update({
      where: { id: req.params.id },
      data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() },
      include: { items: true }
    });
    // Restore stock to company
    for (const item of ret.items) {
      await prisma.companyStock.upsert({
        where: { productId: item.productId },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, quantity: item.quantity }
      });
    }
    // Create credit note transaction
    if (ret.customerId) {
      await prisma.customer.update({
        where: { id: ret.customerId },
        data: { currentBalance: { decrement: ret.totalAmount } }
      });
      const cust = await prisma.customer.findUnique({ where: { id: ret.customerId } });
      await prisma.customerTransaction.create({
        data: { customerId: ret.customerId, saleId: ret.saleId, type: 'refund', amount: ret.totalAmount, balanceAfter: cust.currentBalance, description: `Sales Return ${ret.returnNumber}` }
      });
    }

    createAuditLog(req.user.id, 'APPROVE', 'SalesReturn', req.params.id, null, { returnNumber: ret.returnNumber, totalAmount: ret.totalAmount }, req.ip);

    res.json(ret);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/sales-returns/:id/reject', authMiddleware, async (req, res) => {
  try {
    const ret = await prisma.salesReturn.update({
      where: { id: req.params.id },
      data: { status: 'rejected', approvedBy: req.user.id, approvedAt: new Date() }
    });

    createAuditLog(req.user.id, 'REJECT', 'SalesReturn', req.params.id, null, null, req.ip);

    res.json(ret);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 3: LOW STOCK ALERTS ====================

app.get('/api/stock-alerts', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { reorderPoint: { not: null } },
      include: { companyStock: true, branchStocks: true }
    });
    const alerts = products.filter(p => {
      const totalQty = (p.companyStock?.quantity || 0) + p.branchStocks.reduce((s, b) => s + b.quantity, 0);
      return totalQty <= (p.reorderPoint || 0);
    }).map(p => ({
      ...p,
      totalStock: (p.companyStock?.quantity || 0) + p.branchStocks.reduce((s, b) => s + b.quantity, 0),
    }));
    res.json(alerts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/products/:id/reorder-point', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { reorderPoint: req.body.reorderPoint }
    });
    res.json(product);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 4: PAYROLL PROCESSING ====================

app.post('/api/payroll/generate', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.body;
    const employees = await prisma.user.findMany({ where: { role: { notIn: ['stock_manager', 'account_manager'] } } });
    const daysInMonth = new Date(year, month, 0).getDate();
    const payroll = [];

    for (const emp of employees) {
      const attendance = await prisma.attendance.findMany({
        where: { userId: emp.id, date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month - 1, daysInMonth) } }
      });
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const halfDays = attendance.filter(a => a.status === 'half_day').length;
      const lateDays = attendance.filter(a => a.status === 'late').length;
      const paidDays = presentDays + lateDays + halfDays * 0.5;
      const lopDays = Math.max(0, daysInMonth - paidDays);
      const prorateFactor = daysInMonth > 0 ? paidDays / daysInMonth : 1;

      const totalEarningFull = (emp.basicSalary || 0) + (emp.houseRentAllowance || 0) + (emp.conveyanceAllowance || 0) +
        (emp.medicalAllowance || 0) + (emp.uniformAllowance || 0) + (emp.educationAllowance || 0) +
        (emp.ltaAllowance || 0) + (emp.specialAllowance || 0);
      const totalEarning = Math.round(totalEarningFull * prorateFactor);
      const pTax = 200;
      const pf = emp.pfDeduction || 0;
      const netPay = totalEarning - pTax - pf;

      payroll.push({
        employeeId: emp.id, employeeName: emp.name, employeeCode: emp.employeeCode,
        designation: emp.designation, bankName: emp.bankName, bankAccountNo: emp.bankAccountNo,
        bankIfsc: emp.bankIfscCode, daysInMonth, presentDays, halfDays, lateDays, paidDays, lopDays,
        grossSalary: totalEarningFull, proratedEarning: totalEarning, pTax, pf,
        lopDeduction: totalEarningFull - totalEarning, netPay, month, year
      });
    }
    res.json(payroll);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 6: PRODUCT EXPIRY TRACKING ====================

app.get('/api/product-batches', authMiddleware, async (req, res) => {
  try {
    const { daysToExpiry } = req.query;
    const where = {};
    if (daysToExpiry) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(daysToExpiry));
      where.expDate = { lte: futureDate };
      where.quantity = { gt: 0 };
    }
    const batches = await prisma.productBatch.findMany({
      where, include: { product: true, branch: true }, orderBy: { expDate: 'asc' }
    });
    res.json(batches);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/product-batches', authMiddleware, async (req, res) => {
  try {
    const batch = await prisma.productBatch.create({ data: req.body });
    res.json(batch);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 7: SALESMAN PERFORMANCE ====================

app.get('/api/performance/salesman', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const salesmen = await prisma.user.findMany({ where: { role: 'salesman' }, include: { branch: true } });
    const performance = [];

    for (const sm of salesmen) {
      const sales = await prisma.sale.findMany({
        where: { salesmanId: sm.id, status: 'approved', saleDate: { gte: startDate, lte: endDate } }
      });
      const totalSales = sales.length;
      const totalAmount = sales.reduce((s, sale) => s + sale.finalAmount, 0);
      const totalCollected = sales.reduce((s, sale) => s + sale.amountPaid, 0);
      const attendance = await prisma.attendance.count({
        where: { userId: sm.id, date: { gte: startDate, lte: endDate }, status: { in: ['present', 'late'] } }
      });

      performance.push({
        id: sm.id, name: sm.name, branch: sm.branch?.name || 'N/A',
        totalSales, totalAmount, totalCollected, outstanding: totalAmount - totalCollected,
        presentDays: attendance, avgSalePerDay: attendance > 0 ? Math.round(totalAmount / attendance) : 0
      });
    }
    performance.sort((a, b) => b.totalAmount - a.totalAmount);
    res.json(performance);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 8: PURCHASE/SUPPLIER MANAGEMENT ====================

app.get('/api/suppliers', authMiddleware, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/suppliers', authMiddleware, async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.json(supplier);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/suppliers/:id', authMiddleware, async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json(supplier);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/suppliers/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchases', authMiddleware, async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(purchases);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchases', authMiddleware, async (req, res) => {
  try {
    const { supplierId, items, totalAmount, discount, finalAmount, cgstRate, sgstRate, amountPaid, notes } = req.body;
    const count = await prisma.purchase.count();
    const purchaseNumber = `PUR-${String(count + 1).padStart(6, '0')}`;
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber, supplierId, totalAmount, discount, finalAmount, cgstRate, sgstRate,
        amountPaid: amountPaid || 0, balanceDue: finalAmount - (amountPaid || 0),
        paymentStatus: amountPaid >= finalAmount ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
        notes, items: { create: items }
      },
      include: { items: true, supplier: true }
    });
    // Add stock to company
    for (const item of items) {
      await prisma.companyStock.upsert({
        where: { productId: item.productId },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, quantity: item.quantity }
      });
    }

    createAuditLog(req.user.id, 'CREATE', 'Purchase', purchase.id, null, { purchaseNumber: purchase.purchaseNumber, amount: purchase.finalAmount }, req.ip);

    res.json(purchase);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 10: DAILY COLLECTION REPORT ====================

app.get('/api/reports/daily-collection', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const payments = await prisma.payment.findMany({
      where: { paymentDate: { gte: startOfDay, lt: endOfDay } },
      include: { customer: true }
    });

    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lt: endOfDay }, status: 'approved' },
      include: { salesman: true }
    });

    const bySalesman = {};
    sales.forEach(s => {
      if (!bySalesman[s.salesmanId]) bySalesman[s.salesmanId] = { name: s.salesman.name, sales: 0, amount: 0, collected: 0 };
      bySalesman[s.salesmanId].sales++;
      bySalesman[s.salesmanId].amount += s.finalAmount;
      bySalesman[s.salesmanId].collected += s.amountPaid;
    });

    const byMethod = { cash: 0, card: 0, upi: 0, credit: 0 };
    payments.forEach(p => { byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + p.amount; });

    res.json({
      date: startOfDay, totalSales: sales.length,
      totalSaleAmount: sales.reduce((s, sale) => s + sale.finalAmount, 0),
      totalCollected: payments.reduce((s, p) => s + p.amount, 0),
      paymentsByMethod: byMethod, bySalesman: Object.values(bySalesman), payments
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 12: LEAVE MANAGEMENT ====================

app.get('/api/leaves', authMiddleware, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'stock_manager' || req.user.role === 'account_manager') {
      where = {};
    } else if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where = { userId: { in: branchUserIds } };
      } else {
        where = { userId: req.user.id };
      }
    } else {
      where = { userId: req.user.id };
    }
    if (req.query.status) where.status = req.query.status;
    const leaves = await prisma.leaveRequest.findMany({
      where, include: { user: { select: { id: true, name: true, email: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/leaves', authMiddleware, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const leave = await prisma.leaveRequest.create({
      data: { userId: req.user.id, leaveType, startDate: start, endDate: end, totalDays, reason }
    });
    res.json(leave);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/leaves/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const leaveCheck = await prisma.leaveRequest.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!leaveCheck || leaveCheck.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only approve leaves for your branch employees' });
      }
    }
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
    });

    createAuditLog(req.user.id, 'APPROVE', 'LeaveRequest', req.params.id, null, { userId: leave.userId, leaveType: leave.leaveType }, req.ip);

    res.json(leave);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/leaves/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      const leaveCheck = await prisma.leaveRequest.findUnique({ where: { id: req.params.id }, include: { user: { select: { branchId: true } } } });
      if (!leaveCheck || leaveCheck.user.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only reject leaves for your branch employees' });
      }
    }
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'rejected', approvedBy: req.user.id, approvedAt: new Date(), rejectionReason: req.body.reason }
    });

    createAuditLog(req.user.id, 'REJECT', 'LeaveRequest', req.params.id, null, { userId: leave.userId, reason: req.body.reason }, req.ip);

    res.json(leave);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 13: DAMAGE/WASTAGE TRACKING ====================

app.get('/api/damages', authMiddleware, async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) where.branchId = managedBranchId;
    }
    const damages = await prisma.damageRecord.findMany({
      where,
      include: { product: true, branch: true, reportedByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(damages);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/damages', authMiddleware, async (req, res) => {
  try {
    const { productId, branchId, quantity, reason } = req.body;
    const damage = await prisma.damageRecord.create({
      data: { productId, branchId: branchId || null, quantity, reason, reportedBy: req.user.id }
    });
    res.json(damage);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/damages/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const damage = await prisma.damageRecord.findUnique({ where: { id: req.params.id } });
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (!damage || damage.branchId !== managedBranchId) {
        return res.status(403).json({ error: 'Can only approve damages for your branch' });
      }
    }
    // Deduct stock
    if (damage.branchId) {
      await prisma.branchStock.updateMany({
        where: { branchId: damage.branchId, productId: damage.productId },
        data: { quantity: { decrement: damage.quantity } }
      });
    } else {
      await prisma.companyStock.update({
        where: { productId: damage.productId },
        data: { quantity: { decrement: damage.quantity } }
      });
    }
    const updated = await prisma.damageRecord.update({
      where: { id: req.params.id },
      data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
    });

    createAuditLog(req.user.id, 'APPROVE', 'DamageRecord', req.params.id, null, { productId: damage.productId, quantity: damage.quantity }, req.ip);

    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 14: CUSTOMER CREDIT LIMIT ====================

app.put('/api/customers/:id/credit-limit', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { creditLimit: req.body.creditLimit }
    });
    res.json(customer);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/customers/credit-check/:customerId', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const creditLimit = customer.creditLimit || 0;
    const currentBalance = customer.currentBalance || 0;
    const availableCredit = creditLimit > 0 ? creditLimit - currentBalance : Infinity;
    res.json({ creditLimit, currentBalance, availableCredit, canPurchase: availableCredit > 0 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FEATURE 15: AUDIT LOG ====================

app.get('/api/audit-logs', authMiddleware, async (req, res) => {
  try {
    const { entity, action, userId, limit: lmt } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    const logs = await prisma.auditLog.findMany({
      where, include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: parseInt(lmt) || 100
    });
    res.json(logs);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Helper to create audit log
async function createAuditLog(userId, action, entity, entityId, oldValues, newValues, ipAddress) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, oldValues: oldValues ? JSON.stringify(oldValues) : null, newValues: newValues ? JSON.stringify(newValues) : null, ipAddress }
    });
  } catch (e) { console.error('Audit log error:', e.message); }
}

// Helper to get the branch managed by a user
async function getManagedBranchId(userId) {
  const branch = await prisma.branch.findFirst({ where: { managerId: userId } });
  return branch ? branch.id : null;
}

// Helper to get user IDs in a branch
async function getBranchUserIds(branchId) {
  const users = await prisma.user.findMany({ where: { branchId }, select: { id: true } });
  return users.map(u => u.id);
}

// ==================== STOCK UPDATE REQUEST ROUTES ====================

// Create stock update request (Branch Manager only)
app.post('/api/stock-update-requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'branch_manager') {
      return res.status(403).json({ error: 'Only branch managers can request stock updates' });
    }
    const { branchId, productId, requestedQuantity, requestType, reason } = req.body;
    const managedBranchId = await getManagedBranchId(req.user.id);
    if (!managedBranchId || managedBranchId !== branchId) {
      return res.status(403).json({ error: 'You can only request changes for your own branch' });
    }
    const current = await prisma.branchStock.findUnique({
      where: { branchId_productId: { branchId, productId } }
    });
    const request = await prisma.stockUpdateRequest.create({
      data: {
        branchId, productId,
        requestType: requestType || 'update_quantity',
        currentQuantity: current?.quantity || 0,
        requestedQuantity,
        reason: reason || null,
        requestedBy: req.user.id
      },
      include: { product: true, branch: true }
    });
    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'stock_manager' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id, type: 'stock_update_request',
          title: 'Stock Update Request',
          message: `${req.user.name} requested to change ${request.product.name} qty from ${request.currentQuantity || 0} to ${requestedQuantity} at ${request.branch.name}`,
          entityType: 'StockUpdateRequest', entityId: request.id, createdBy: req.user.id
        }
      });
    }
    createAuditLog(req.user.id, 'CREATE', 'StockUpdateRequest', request.id, null, { productId, branchId, requestedQuantity }, req.ip);
    res.status(201).json(request);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get stock update requests
app.get('/api/stock-update-requests', authMiddleware, async (req, res) => {
  try {
    const { status, branchId } = req.query;
    const where = {};
    if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      where.branchId = managedBranchId;
    } else if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (status) where.status = status;
    if (branchId && req.user.role === 'stock_manager') where.branchId = branchId;
    const requests = await prisma.stockUpdateRequest.findMany({
      where,
      include: {
        product: true, branch: true,
        requestedByUser: { select: { id: true, name: true, email: true, employeeCode: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Approve stock update request (Admin only)
app.put('/api/stock-update-requests/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can approve stock changes' });
    }
    const request = await prisma.stockUpdateRequest.findUnique({
      where: { id: req.params.id },
      include: { product: true, branch: true }
    });
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed request' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.branchStock.upsert({
        where: { branchId_productId: { branchId: request.branchId, productId: request.productId } },
        update: { quantity: request.requestedQuantity, lastUpdated: new Date() },
        create: { branchId: request.branchId, productId: request.productId, quantity: request.requestedQuantity }
      });
      await tx.stockUpdateRequest.update({
        where: { id: req.params.id },
        data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
      });
    });
    await prisma.notification.create({
      data: {
        userId: request.requestedBy, type: 'stock_approved',
        title: 'Stock Update Approved',
        message: `Your request to update ${request.product.name} to qty ${request.requestedQuantity} at ${request.branch.name} has been approved`,
        entityType: 'StockUpdateRequest', entityId: request.id, createdBy: req.user.id
      }
    });
    createAuditLog(req.user.id, 'APPROVE', 'StockUpdateRequest', req.params.id, null, { productId: request.productId, quantity: request.requestedQuantity }, req.ip);
    res.json({ message: 'Stock update approved and applied' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Reject stock update request (Admin only)
app.put('/api/stock-update-requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can reject stock changes' });
    }
    const { rejectionReason } = req.body;
    const request = await prisma.stockUpdateRequest.findUnique({
      where: { id: req.params.id },
      include: { product: true, branch: true }
    });
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed request' });
    }
    await prisma.stockUpdateRequest.update({
      where: { id: req.params.id },
      data: { status: 'rejected', approvedBy: req.user.id, approvedAt: new Date(), rejectionReason: rejectionReason || null }
    });
    await prisma.notification.create({
      data: {
        userId: request.requestedBy, type: 'stock_rejected',
        title: 'Stock Update Rejected',
        message: `Your request to update ${request.product.name} at ${request.branch.name} was rejected. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
        entityType: 'StockUpdateRequest', entityId: request.id, createdBy: req.user.id
      }
    });
    createAuditLog(req.user.id, 'REJECT', 'StockUpdateRequest', req.params.id, null, { reason: rejectionReason }, req.ip);
    res.json({ message: 'Stock update request rejected' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== NOTIFICATION ROUTES ====================

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const where = { userId: req.user.id };
    if (req.query.unreadOnly === 'true') where.isRead = false;
    const notifications = await prisma.notification.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50
    });
    res.json(notifications);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ message: 'Marked as read' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All marked as read' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ count });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== GPS TRACKING & ROUTE MANAGEMENT ====================

// Record salesman location (called from mobile app every few minutes)
app.post('/api/gps/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, address } = req.body;

    const location = await prisma.salesmanLocation.create({
      data: {
        userId: req.user.id,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        altitude,
        batteryLevel,
        address
      }
    });

    // Update daily route summary
    const nowLoc = new Date();
    const todayLocStr = `${nowLoc.getFullYear()}-${String(nowLoc.getMonth() + 1).padStart(2, '0')}-${String(nowLoc.getDate()).padStart(2, '0')}`;
    const todayLoc = new Date(todayLocStr + 'T00:00:00.000Z');
    const nextDayLoc = new Date(todayLoc);
    nextDayLoc.setUTCDate(nextDayLoc.getUTCDate() + 1);

    try {
      // Fetch previous GPS location from today to calculate distance
      const previousLocation = await prisma.salesmanLocation.findFirst({
        where: {
          userId: req.user.id,
          timestamp: { gte: todayLoc, lt: nextDayLoc },
          id: { not: location.id }
        },
        orderBy: { timestamp: 'desc' }
      });

      let distanceIncrement = 0;
      if (previousLocation) {
        const distMeters = calculateDistance(
          previousLocation.latitude, previousLocation.longitude,
          latitude, longitude
        );
        // Filter GPS drift: only count if between 10m and 500m
        if (distMeters >= 10 && distMeters <= 500) {
          distanceIncrement = distMeters / 1000; // convert to km
        }
      }

      const existingSummary = await prisma.dailyRouteSummary.findFirst({
        where: { userId: req.user.id, date: { gte: todayLoc, lt: nextDayLoc } }
      });

      if (existingSummary) {
        await prisma.dailyRouteSummary.update({
          where: { id: existingSummary.id },
          data: {
            endTime: new Date(),
            ...(distanceIncrement > 0 ? { totalDistanceKm: { increment: distanceIncrement } } : {})
          }
        });
      } else {
        await prisma.dailyRouteSummary.create({
          data: { userId: req.user.id, date: todayLoc, startTime: new Date(), totalDistanceKm: distanceIncrement }
        });
      }
    } catch (e) {
      console.error('Summary update error:', e.message);
    }

    res.json(location);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get salesman's location history for a date
app.get('/api/gps/history/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    // Only allow stock_manager or self to view
    if (req.user.role !== 'stock_manager' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const locations = await prisma.salesmanLocation.findMany({
      where: {
        userId,
        timestamp: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json(locations);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get all salesmen's current locations (Admin dashboard)
app.get('/api/gps/live-tracking', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager') {
      return res.status(403).json({ error: 'Only admin can view live tracking' });
    }

    // Get latest location for each active salesman
    const salesmen = await prisma.user.findMany({
      where: { role: 'salesman' },
      select: { id: true, name: true, phone: true, employeeCode: true, branch: true }
    });

    const liveData = [];
    for (const sm of salesmen) {
      const lastLocation = await prisma.salesmanLocation.findFirst({
        where: { userId: sm.id },
        orderBy: { timestamp: 'desc' }
      });

      // Get today's summary
      const nowT = new Date();
      const todayTStr = `${nowT.getFullYear()}-${String(nowT.getMonth() + 1).padStart(2, '0')}-${String(nowT.getDate()).padStart(2, '0')}`;
      const todayT = new Date(todayTStr + 'T00:00:00.000Z');
      const nextDayT = new Date(todayT);
      nextDayT.setUTCDate(nextDayT.getUTCDate() + 1);

      const summary = await prisma.dailyRouteSummary.findFirst({
        where: { userId: sm.id, date: { gte: todayT, lt: nextDayT } }
      });

      // Get today's visits count
      const visitsCount = await prisma.customerVisit.count({
        where: { userId: sm.id, visitDate: { gte: todayT, lt: nextDayT } }
      });

      // Calculate total hours
      let totalHours = 0;
      if (summary?.startTime) {
        const start = new Date(summary.startTime);
        const end = summary.endTime ? new Date(summary.endTime) : new Date();
        totalHours = (end - start) / (1000 * 60 * 60);
      }

      liveData.push({
        salesman: sm,
        lastLocation,
        lastSeen: lastLocation?.timestamp || null,
        isOnline: lastLocation && (new Date() - new Date(lastLocation.timestamp)) < 15 * 60 * 1000, // Active in last 15 mins
        todayStats: {
          customersVisited: visitsCount,
          distanceKm: summary?.totalDistanceKm || 0,
          startTime: summary?.startTime,
          endTime: summary?.endTime,
          totalHours: Math.round(totalHours * 100) / 100,
          productiveHours: Math.round((summary?.productiveHours || 0) * 100) / 100
        }
      });
    }

    res.json(liveData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Customer Visit - Check In
app.post('/api/gps/visit/check-in', authMiddleware, async (req, res) => {
  try {
    const { customerId, customerName, latitude, longitude, address, photo, visitPurpose } = req.body;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location coordinates are required' });
    }

    // Use date string to avoid timezone issues with MySQL DATE type
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(todayStr + 'T00:00:00.000Z');

    // Ensure customerId is null if empty string
    const validCustomerId = customerId && customerId.trim() !== '' ? customerId : null;

    // Calculate distance from customer's registered location if exists
    let distanceFromCustomer = null;
    if (validCustomerId) {
      const customerLoc = await prisma.customerLocation.findUnique({
        where: { customerId: validCustomerId }
      });
      if (customerLoc) {
        distanceFromCustomer = calculateDistance(latitude, longitude, customerLoc.latitude, customerLoc.longitude);
      }
    }

    const visit = await prisma.customerVisit.create({
      data: {
        userId: req.user.id,
        customerId: validCustomerId,
        customerName: customerName || null,
        checkInTime: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLng: parseFloat(longitude),
        checkInAddress: address || null,
        checkInPhoto: photo || null,
        visitPurpose: visitPurpose || null,
        distanceFromCustomer,
        visitDate: today
      },
      include: { customer: true }
    });

    // Update daily summary - handle upsert manually due to composite key
    try {
      // Use date range for finding existing summary
      const nextDay = new Date(today);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const existingSummary = await prisma.dailyRouteSummary.findFirst({
        where: {
          userId: req.user.id,
          date: {
            gte: today,
            lt: nextDay
          }
        }
      });

      if (existingSummary) {
        await prisma.dailyRouteSummary.update({
          where: { id: existingSummary.id },
          data: { totalCustomersVisited: { increment: 1 } }
        });
      } else {
        await prisma.dailyRouteSummary.create({
          data: { userId: req.user.id, date: today, totalCustomersVisited: 1 }
        });
      }
    } catch (summaryError) {
      console.error('Summary update error (non-critical):', summaryError.message);
    }

    res.json(visit);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Customer Visit - Check Out
app.put('/api/gps/visit/:visitId/check-out', authMiddleware, async (req, res) => {
  try {
    const { visitId } = req.params;
    const { latitude, longitude, address, outcome, notes, orderId, saleId, amountCollected } = req.body;

    const visit = await prisma.customerVisit.findUnique({ where: { id: visitId } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Calculate duration
    const checkOutTime = new Date();
    const durationMinutes = Math.round((checkOutTime - new Date(visit.checkInTime)) / (1000 * 60));

    const updatedVisit = await prisma.customerVisit.update({
      where: { id: visitId },
      data: {
        checkOutTime,
        checkOutLat: latitude,
        checkOutLng: longitude,
        checkOutAddress: address,
        durationMinutes,
        outcome,
        notes,
        orderId,
        saleId,
        amountCollected
      },
      include: { customer: true }
    });

    // Update daily summary with collection and productive hours
    const nowCO = new Date();
    const todayCOStr = `${nowCO.getFullYear()}-${String(nowCO.getMonth() + 1).padStart(2, '0')}-${String(nowCO.getDate()).padStart(2, '0')}`;
    const todayCO = new Date(todayCOStr + 'T00:00:00.000Z');
    const nextDayCO = new Date(todayCO);
    nextDayCO.setUTCDate(nextDayCO.getUTCDate() + 1);
    const smry = await prisma.dailyRouteSummary.findFirst({
      where: { userId: req.user.id, date: { gte: todayCO, lt: nextDayCO } }
    });
    if (smry) {
      const updateData = {
        endTime: new Date(),
        productiveHours: { increment: durationMinutes / 60 },
        ...(amountCollected > 0 ? { totalAmountCollected: { increment: amountCollected } } : {})
      };
      await prisma.dailyRouteSummary.update({
        where: { id: smry.id },
        data: updateData
      });
    }

    if (outcome === 'order_placed') {
      const nowOrd = new Date();
      const todayOrdStr = `${nowOrd.getFullYear()}-${String(nowOrd.getMonth() + 1).padStart(2, '0')}-${String(nowOrd.getDate()).padStart(2, '0')}`;
      const todayOrd = new Date(todayOrdStr + 'T00:00:00.000Z');
      const nextDayOrd = new Date(todayOrd);
      nextDayOrd.setUTCDate(nextDayOrd.getUTCDate() + 1);
      const smryOrd = await prisma.dailyRouteSummary.findFirst({
        where: { userId: req.user.id, date: { gte: todayOrd, lt: nextDayOrd } }
      });
      if (smryOrd) {
        await prisma.dailyRouteSummary.update({
          where: { id: smryOrd.id },
          data: { totalOrdersTaken: { increment: 1 } }
        });
      }
    }

    res.json(updatedVisit);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get salesman's visits for a day
app.get('/api/gps/visits/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (req.user.role !== 'stock_manager' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parse date string to avoid timezone issues
    let targetDateStr;
    if (date) {
      // date comes in format 'yyyy-MM-dd'
      targetDateStr = date;
    } else {
      const now = new Date();
      targetDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Create date object from string in UTC to match stored format
    const targetDate = new Date(targetDateStr + 'T00:00:00.000Z');

    // Query using date range to handle any timezone edge cases
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const visits = await prisma.customerVisit.findMany({
      where: {
        userId,
        visitDate: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: { customer: true },
      orderBy: { checkInTime: 'asc' }
    });

    res.json(visits);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get daily route summary
app.get('/api/gps/summary/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (req.user.role !== 'stock_manager' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where = { userId };
    if (startDate && endDate) {
      // Parse dates properly to handle timezone
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T00:00:00.000Z');
      end.setUTCDate(end.getUTCDate() + 1); // Include the end date
      where.date = { gte: start, lt: end };
    }

    const summaries = await prisma.dailyRouteSummary.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(summaries);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Save/Update customer location for geofencing
app.post('/api/gps/customer-location', authMiddleware, async (req, res) => {
  try {
    const { customerId, latitude, longitude, address, geofenceRadius } = req.body;

    const location = await prisma.customerLocation.upsert({
      where: { customerId },
      create: { customerId, latitude, longitude, address, geofenceRadius: geofenceRadius || 100 },
      update: { latitude, longitude, address, geofenceRadius: geofenceRadius || 100 }
    });

    res.json(location);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get customer location
app.get('/api/gps/customer-location/:customerId', authMiddleware, async (req, res) => {
  try {
    const location = await prisma.customerLocation.findUnique({
      where: { customerId: req.params.customerId },
      include: { customer: true }
    });
    res.json(location);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get all customer locations for map
app.get('/api/gps/customer-locations', authMiddleware, async (req, res) => {
  try {
    const locations = await prisma.customerLocation.findMany({
      include: { customer: { select: { id: true, name: true, phone: true, address: true } } }
    });
    res.json(locations);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update distance traveled (called when significant movement detected)
app.post('/api/gps/update-distance', authMiddleware, async (req, res) => {
  try {
    const { distanceKm } = req.body;
    const nowD = new Date();
    const todayDStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
    const todayD = new Date(todayDStr + 'T00:00:00.000Z');
    const nextDayD = new Date(todayD);
    nextDayD.setUTCDate(nextDayD.getUTCDate() + 1);

    const existingSummary = await prisma.dailyRouteSummary.findFirst({
      where: { userId: req.user.id, date: { gte: todayD, lt: nextDayD } }
    });

    if (existingSummary) {
      await prisma.dailyRouteSummary.update({
        where: { id: existingSummary.id },
        data: { totalDistanceKm: { increment: distanceKm } }
      });
    } else {
      await prisma.dailyRouteSummary.create({
        data: { userId: req.user.id, date: todayD, totalDistanceKm: distanceKm }
      });
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== DEALER APPLICATIONS ====================

// Get all dealer applications (role-based access)
app.get('/api/dealer-applications', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};

    if (req.user.role === 'stock_manager' || req.user.role === 'account_manager') {
      // Admin sees all
    } else if (req.user.role === 'branch_manager') {
      const managedBranchId = await getManagedBranchId(req.user.id);
      if (managedBranchId) {
        const branchUserIds = await getBranchUserIds(managedBranchId);
        where.userId = { in: branchUserIds };
      } else {
        where.userId = req.user.id;
      }
    } else {
      where.userId = req.user.id;
    }

    if (status) {
      where.status = status;
    }

    const applications = await prisma.dealerApplication.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dealer application by ID
app.get('/api/dealer-applications/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await prisma.dealerApplication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Dealer application not found' });
    }

    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager' && application.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create dealer application (any authenticated user)
app.post('/api/dealer-applications', authMiddleware, async (req, res) => {
  try {
    const data = req.body;

    const application = await prisma.dealerApplication.create({
      data: {
        userId: req.user.id,
        firmName: data.firmName,
        fullAddress: data.fullAddress,
        firmType: data.firmType,
        mobile: data.mobile,
        telephone: data.telephone,
        email: data.email,
        partner1Name: data.partner1Name,
        partner1Address: data.partner1Address,
        partner2Name: data.partner2Name,
        partner2Address: data.partner2Address,
        partner3Name: data.partner3Name,
        partner3Address: data.partner3Address,
        residenceAddress: data.residenceAddress,
        pan: data.pan,
        gst: data.gst,
        license: data.license,
        udyam: data.udyam,
        validity: data.validity,
        businessNature: data.businessNature,
        turnoverWholesaler: data.turnoverWholesaler,
        turnoverRetailer: data.turnoverRetailer,
        establishmentDate: data.establishmentDate,
        bankName: data.bankName,
        accountNo: data.accountNo,
        branch: data.branch,
        ifsc: data.ifsc,
        company1Name: data.company1Name,
        company1Product: data.company1Product,
        company1Turnover: data.company1Turnover,
        company2Name: data.company2Name,
        company2Product: data.company2Product,
        company2Turnover: data.company2Turnover,
        company3Name: data.company3Name,
        company3Product: data.company3Product,
        company3Turnover: data.company3Turnover,
        chequeNo1: data.chequeNo1,
        chequeNo2: data.chequeNo2,
        chequeNo3: data.chequeNo3,
        bankNameSecurity: data.bankNameSecurity,
        securityAmount: data.securityAmount,
        rtgsDetails: data.rtgsDetails,
        dealerPlace: data.dealerPlace,
        dealerDate: data.dealerDate,
        remark: data.remark,
        photo: data.photo,
        stamp: data.stamp,
        cheque: data.cheque,
        signature: data.signature,
        tsoSignature: data.tsoSignature,
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      }
    });

    createAuditLog(req.user.id, 'CREATE', 'DealerApplication', application.id, null, { firmName: data.firmName }, req.ip);

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dealer application (only pending, by owner)
app.put('/api/dealer-applications/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.dealerApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Dealer application not found' });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot edit other user\'s application' });
    }

    if (existing.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot edit approved/rejected application' });
    }

    const application = await prisma.dealerApplication.update({
      where: { id },
      data: {
        firmName: data.firmName,
        fullAddress: data.fullAddress,
        firmType: data.firmType,
        mobile: data.mobile,
        telephone: data.telephone,
        email: data.email,
        partner1Name: data.partner1Name,
        partner1Address: data.partner1Address,
        partner2Name: data.partner2Name,
        partner2Address: data.partner2Address,
        partner3Name: data.partner3Name,
        partner3Address: data.partner3Address,
        residenceAddress: data.residenceAddress,
        pan: data.pan,
        gst: data.gst,
        license: data.license,
        udyam: data.udyam,
        validity: data.validity,
        businessNature: data.businessNature,
        turnoverWholesaler: data.turnoverWholesaler,
        turnoverRetailer: data.turnoverRetailer,
        establishmentDate: data.establishmentDate,
        bankName: data.bankName,
        accountNo: data.accountNo,
        branch: data.branch,
        ifsc: data.ifsc,
        company1Name: data.company1Name,
        company1Product: data.company1Product,
        company1Turnover: data.company1Turnover,
        company2Name: data.company2Name,
        company2Product: data.company2Product,
        company2Turnover: data.company2Turnover,
        company3Name: data.company3Name,
        company3Product: data.company3Product,
        company3Turnover: data.company3Turnover,
        chequeNo1: data.chequeNo1,
        chequeNo2: data.chequeNo2,
        chequeNo3: data.chequeNo3,
        bankNameSecurity: data.bankNameSecurity,
        securityAmount: data.securityAmount,
        rtgsDetails: data.rtgsDetails,
        dealerPlace: data.dealerPlace,
        dealerDate: data.dealerDate,
        remark: data.remark,
        photo: data.photo,
        stamp: data.stamp,
        cheque: data.cheque,
        signature: data.signature,
        tsoSignature: data.tsoSignature,
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      }
    });

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dealer application (pending by owner, or admin)
app.delete('/api/dealer-applications/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dealerApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Dealer application not found' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Cannot delete other user\'s application' });
    }

    if (existing.status !== 'pending' && req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Cannot delete approved/rejected application' });
    }

    await prisma.dealerApplication.delete({ where: { id } });
    res.json({ message: 'Dealer application deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve dealer application (stock_manager/account_manager only)
app.put('/api/dealer-applications/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const application = await prisma.dealerApplication.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      }
    });

    createAuditLog(req.user.id, 'APPROVE', 'DealerApplication', id, null, { firmName: application.firmName }, req.ip);

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject dealer application (stock_manager/account_manager only)
app.put('/api/dealer-applications/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'stock_manager' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const application = await prisma.dealerApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true, branchId: true } }
      }
    });

    createAuditLog(req.user.id, 'REJECT', 'DealerApplication', id, null, { firmName: application.firmName, reason: rejectionReason }, req.ip);

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate distance between two GPS points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return distance in meters
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
