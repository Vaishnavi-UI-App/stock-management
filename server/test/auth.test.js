import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// A stable object the app's `new PrismaClient()` resolves to. Its methods are
// (re)assigned fresh before each test so assertions stay isolated.
const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {} }));

vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockPrisma) }));

import indexModule from '../src/index.js';
const { app } = indexModule;

beforeEach(() => {
  Object.assign(mockPrisma, {
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 when the user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@stock.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 when the password is wrong', async () => {
    const hash = bcrypt.hashSync('the-real-password', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'manager@stock.com', password: hash, role: 'stock_manager', branch: null,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@stock.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns a valid JWT and the user (without password) on success', async () => {
    const hash = bcrypt.hashSync('password123', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'manager@stock.com', password: hash, role: 'stock_manager', branch: null,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@stock.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    // password must never be returned
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.email).toBe('manager@stock.com');
    // token must be verifiable with the server secret and carry the user id
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe('u1');
  });
});
