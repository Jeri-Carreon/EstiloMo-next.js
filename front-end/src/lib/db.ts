// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const MISSING_SALE_VAT_RATE_MESSAGE =
  'Database schema is missing Sale.vatRate. Apply Prisma migration 20260721100000_add_sale_vat_rate with `npx prisma migrate deploy`, then run `npx prisma generate`.';

function withSchemaSyncError(error: unknown) {
  const prismaError = error as { code?: string; message?: string };

  if (
    prismaError?.code === 'P2022' &&
    prismaError.message?.includes('Sale.vatRate')
  ) {
    return new Error(MISSING_SALE_VAT_RATE_MESSAGE);
  }

  return error;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        try {
          return await query(args);
        } catch (error) {
          throw withSchemaSyncError(error);
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
