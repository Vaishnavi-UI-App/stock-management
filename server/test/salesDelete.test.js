import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {} }));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockPrisma) }));

import indexModule from '../src/index.js';
const { app } = indexModule;

// Build a token for an acting user and make authMiddleware resolve to them.
function actAs(user) {
  mockPrisma.user.findUnique.mockResolvedValue(user);
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
}

function makeSale(overrides = {}) {
  return {
    id: 's1',
    billNumber: 'INV-0001',
    salesmanId: 'u1',
    branchId: 'b1',
    customerId: 'c1',
    status: 'approved',
    finalAmount: 100,
    amountPaid: 40,
    deletedAt: null,
    items: [{ productId: 'p1', quantity: 2 }],
    ...overrides,
  };
}

beforeEach(() => {
  Object.assign(mockPrisma, {
    user: { findUnique: vi.fn() },
    sale: { findUnique: vi.fn(), update: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) },
    customer: { update: vi.fn(async () => ({})) },
    salesmanStock: { upsert: vi.fn(async () => ({})) },
    customerTransaction: { deleteMany: vi.fn(async () => ({})) },
    payment: { deleteMany: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
  });
});

describe('DELETE /api/sales/:id (soft delete)', () => {
  it('rejects with 400 when no reason is supplied', async () => {
    const token = actAs({ id: 'mgr', role: 'stock_manager' });
    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason is required/i);
    expect(mockPrisma.sale.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the sale does not exist', async () => {
    const token = actAs({ id: 'mgr', role: 'stock_manager' });
    mockPrisma.sale.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'duplicate' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when the bill was already soft-deleted', async () => {
    const token = actAs({ id: 'mgr', role: 'stock_manager' });
    mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ deletedAt: new Date() }));
    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'oops' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already deleted/i);
  });

  it('returns 403 when a non-owner salesman tries to delete', async () => {
    const token = actAs({ id: 'u2', role: 'salesman' });
    mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ salesmanId: 'u1' }));
    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'not mine' });
    expect(res.status).toBe(403);
    expect(mockPrisma.sale.update).not.toHaveBeenCalled();
  });

  it('SOFT-deletes (never hard-deletes) and reverses stock for an APPROVED sale', async () => {
    const token = actAs({ id: 'mgr', role: 'stock_manager' });
    mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: 'approved' }));

    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'customer cancelled' });

    expect(res.status).toBe(200);
    // The row is updated, not removed — invoice numbers are never reused.
    expect(mockPrisma.sale.delete).not.toHaveBeenCalled();
    expect(mockPrisma.sale.update).toHaveBeenCalledTimes(1);
    const updateArg = mockPrisma.sale.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 's1' });
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArg.data.deletedBy).toBe('mgr');
    expect(updateArg.data.deleteReason).toBe('customer cancelled');
    // approved => stock + customer effects reversed
    expect(mockPrisma.salesmanStock.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.customer.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.customerTransaction.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.payment.deleteMany).toHaveBeenCalled();
  });

  it('soft-deletes a PENDING sale by its owner WITHOUT reversing stock', async () => {
    const token = actAs({ id: 'u1', role: 'salesman' });
    mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: 'pending', salesmanId: 'u1' }));

    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'entered by mistake' });

    expect(res.status).toBe(200);
    expect(mockPrisma.sale.update).toHaveBeenCalledTimes(1);
    // pending stock was never deducted => nothing to reverse
    expect(mockPrisma.salesmanStock.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.customer.update).not.toHaveBeenCalled();
    expect(mockPrisma.payment.deleteMany).not.toHaveBeenCalled();
  });

  it('allows an account_manager to delete (role extension)', async () => {
    const token = actAs({ id: 'acc', role: 'account_manager' });
    mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: 'approved' }));
    const res = await request(app)
      .delete('/api/sales/s1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'accounting correction' });
    expect(res.status).toBe(200);
    expect(mockPrisma.sale.update).toHaveBeenCalledTimes(1);
  });
});
