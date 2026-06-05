import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// Extract the connection string from environment variables
const connectionString = process.env.DATABASE_URL || ''

// Bind the connection string directly to the Prisma adapter
const adapter = new PrismaMariaDb(connectionString)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
