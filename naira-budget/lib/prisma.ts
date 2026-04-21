import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

/** Reuse one client per warm Netlify/Node instance to avoid exhausting DB connections. */
export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
