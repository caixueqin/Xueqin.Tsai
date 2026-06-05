// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

function normalizeEnv(value: string | undefined) {
  return !value || value === 'undefined' || value === 'null' ? undefined : value
}

const rawUrl = normalizeEnv(process.env.DATABASE_URL) || normalizeEnv(process.env.TURSO_DATABASE_URL)
const dbUrl = rawUrl || (process.env.NODE_ENV === 'production' ? undefined : 'file:./dev.db')

if (!dbUrl) {
  throw new Error('Missing database URL. Set DATABASE_URL or TURSO_DATABASE_URL in Vercel environment variables.')
}

const authToken = normalizeEnv(process.env.TURSO_AUTH_TOKEN)

const libsql = createClient({
  url: dbUrl,
  authToken: authToken,
})

const adapter = new PrismaLibSQL(libsql)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
