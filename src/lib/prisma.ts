// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const rawUrl = process.env.DATABASE_URL;
// 拦截 Turbopack 编译时注入的 "undefined" 字符串陷阱
const dbUrl = (!rawUrl || rawUrl === 'undefined' || rawUrl === 'null') ? 'file:./dev.db' : rawUrl;

const rawToken = process.env.TURSO_AUTH_TOKEN;
const authToken = (!rawToken || rawToken === 'undefined' || rawToken === 'null') ? undefined : rawToken;

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
