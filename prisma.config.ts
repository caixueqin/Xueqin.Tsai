import type { PrismaConfig } from '@prisma/client'

const config: PrismaConfig = {
  datasources: {
    db: {
      provider: 'mysql',
      url: process.env.DATABASE_URL || '',
    },
  },
}

export default config
