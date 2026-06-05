import { PrismaClient } from '@prisma/client'
import { PrismaMariadb } from '@prisma/adapter-mariadb'
import { createPool } from 'mariadb'

// Extract the connection string from environment variables
const connectionString = process.env.DATABASE_URL || ''

// Create a database connection pool
const pool = createPool(connectionString)

// Bind the pool to the Prisma adapter
const adapter = new PrismaMariadb(pool)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
