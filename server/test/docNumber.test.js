import { describe, it, expect, vi } from 'vitest';

// Avoid constructing a real Prisma client when importing the app module.
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => ({})) }));

import indexModule from '../src/index.js';
const { generateNextDocNumber } = indexModule;

// Build a fake transaction whose model.findMany returns the given rows.
function fakeTx(rows) {
  return { sale: { findMany: vi.fn(async () => rows) } };
}

describe('generateNextDocNumber', () => {
  it('starts at 0001 when there are no existing documents', async () => {
    const n = await generateNextDocNumber(fakeTx([]), 'sale', 'billNumber', 'INV');
    expect(n).toBe('INV-0001');
  });

  it('returns max(serial)+1 padded to 4 digits', async () => {
    const rows = [{ billNumber: 'INV-0003' }, { billNumber: 'INV-0001' }, { billNumber: 'INV-0002' }];
    const n = await generateNextDocNumber(fakeTx(rows), 'sale', 'billNumber', 'INV');
    expect(n).toBe('INV-0004');
  });

  it('ignores rows with a different prefix', async () => {
    const rows = [{ billNumber: 'PO-0099' }, { billNumber: 'INV-0005' }];
    const n = await generateNextDocNumber(fakeTx(rows), 'sale', 'billNumber', 'INV');
    expect(n).toBe('INV-0006');
  });

  it('ignores null / malformed values', async () => {
    const rows = [{ billNumber: null }, { billNumber: 'garbage' }, { billNumber: 'INV-0007' }];
    const n = await generateNextDocNumber(fakeTx(rows), 'sale', 'billNumber', 'INV');
    expect(n).toBe('INV-0008');
  });

  it('does not collapse serials above 9999 (keeps growing)', async () => {
    const rows = [{ billNumber: 'INV-10000' }];
    const n = await generateNextDocNumber(fakeTx(rows), 'sale', 'billNumber', 'INV');
    expect(n).toBe('INV-10001');
  });
});
