// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { createPool } from 'mariadb'

// We explicitly hardcode the connection string so GoDaddy Preview ENV doesn't hijack it
const connectionString = 'mysql://localhost:MathCraft314@118.139.180.144:3306/MathCraft';
const parsedUrl = new URL(connectionString);

const host = parsedUrl.hostname;
const port = parseInt(parsedUrl.port, 10) || 3306;
const user = decodeURIComponent(parsedUrl.username);
const password = decodeURIComponent(parsedUrl.password);
const database = parsedUrl.pathname.substring(1);

const pool = createPool({
  host,
  user,
  password,
  database,
  port,
  connectTimeout: 10000,
  acquireTimeout: 30000,
  connectionLimit: 2,
  idleTimeout: 300
});

console.log(`[DB Config] Host: ${host}, Port: ${port}, DB: ${database}, User provided: ${!!user}, Password provided: ${!!password}`);

const adapter = new PrismaMariaDb(pool)

// Initialize Prisma with the adapter
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
