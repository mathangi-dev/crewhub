import { PrismaClient } from "@prisma/client"
const g = globalThis as any
export const db: PrismaClient = g.db || (g.db = new PrismaClient())
