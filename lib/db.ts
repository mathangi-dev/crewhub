import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const g = globalThis as any

function initDb(): PrismaClient {
  if (process.env.VERCEL) {
    const tmpDb = path.join("/tmp", "dev.db")
    if (!fs.existsSync(tmpDb)) {
      const sourceDb = path.join(process.cwd(), "prisma", "dev.db")
      if (fs.existsSync(sourceDb)) {
        try {
          fs.copyFileSync(sourceDb, tmpDb)
        } catch (err) {
          console.error("Failed to copy database to /tmp:", err)
        }
      }
    }
    process.env.DATABASE_URL = `file:${tmpDb}`
  }
  return new PrismaClient()
}

export const db: PrismaClient = g.db || (g.db = initDb())

