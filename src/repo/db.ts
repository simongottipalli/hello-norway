import { PrismaClient } from "../generated/prisma/client.js";

export const prisma = new PrismaClient();

export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export type DbClient = typeof prisma;

export function withTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
