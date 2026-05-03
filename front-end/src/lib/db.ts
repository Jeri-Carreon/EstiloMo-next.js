import { PrismaClient } from "@prisma/client";

<<<<<<< Updated upstream
const globalForPrisma = global as unknown as { prisma: PrismaClient };
=======
type User = {
  id: string;
  name?: string;
  email: string;
  password: string;
  role: string;
};
>>>>>>> Stashed changes

export const db =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = db;