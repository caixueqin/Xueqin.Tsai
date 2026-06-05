// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { createPool } from 'mariadb'

// Extract the connection string (with a safe fallback to prevent build-time static analysis crashes)
const connectionString = process.env.DATABASE_URL || 'mysql://dummy:dummy@localhost:3306/dummy'

// The mariadb driver strictly requires the mariadb:// protocol, but Prisma config uses mysql://
const mariadbString = connectionString.replace(/^mysql:\/\//, 'mariadb://')

// 1. Create the MariaDB connection pool
const pool = createPool(mariadbString)

// 2. Bind the pool to the Prisma adapter
// (Using 'as any' bypasses the strict TS type mismatch that caused your previous build error)
const adapter = new PrismaMariaDb(pool as any)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
