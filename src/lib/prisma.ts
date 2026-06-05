// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { createPool } from 'mariadb'

let pool;

if (process.env.DB_HOST) {
  // On GoDaddy: Use raw variables directly to completely avoid URL parsing bugs with special characters in passwords
  pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    
    // Give the preview environment more time to connect
    connectTimeout: 10_000,
    acquireTimeout: 30_000,

    connectionLimit: 2,
    idleTimeout: 300
  });

  console.log(`[DB Config] Host: ${process.env.DB_HOST}, Port: ${process.env.DB_PORT || 3306}, DB: ${process.env.DB_NAME}, User provided: ${!!process.env.DB_USER}, Password provided: ${!!process.env.DB_PASSWORD}`);
} else {
  // Local fallback
  const connectionString = process.env.DATABASE_URL || 'mysql://dummy:dummy@localhost:3306/dummy'
  pool = createPool(connectionString.replace(/^mysql:\/\//, 'mariadb://'))

  console.log(`[DB Config] Using fallback connection string. URL provided: ${!!process.env.DATABASE_URL}`);
}

const adapter = new PrismaMariaDb(pool)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
