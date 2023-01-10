import { PrismaClient } from "@prisma/client"

declare global {
  var __db: PrismaClient | undefined
}

export const db =
  process.env.NODE_ENV === "development"
    ? (global.__db ??= new PrismaClient())
    : new PrismaClient()
