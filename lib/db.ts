import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrisma() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    // Supabase Session Pooler caps at 15 connections total.
    // Keeping max=2 per serverless instance prevents exhaustion even under load.
    // idleTimeoutMillis releases connections quickly so other instances can reuse them.
    // connectionTimeoutMillis fails fast instead of queuing forever when the pool is full.
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

globalForPrisma.prisma = prisma;
