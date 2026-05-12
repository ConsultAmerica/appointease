import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

/** Reuse one client per serverless isolate (Vercel) to avoid connection storms. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
