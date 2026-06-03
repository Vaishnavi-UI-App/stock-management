// Runs before any test module is imported (vitest setupFiles).
// Provide a deterministic env so importing src/index.js never touches a real DB
// or reads developer-specific secrets. The @prisma/client module itself is
// mocked per test file, so this DATABASE_URL is only a syntactically-valid
// placeholder for the PrismaClient constructor.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-vitest';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/test_db';
process.env.PORT = process.env.PORT || '3999';
