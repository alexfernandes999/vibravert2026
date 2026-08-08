import { PrismaClient } from "@prisma/client";

// Em desenvolvimento o Next recarrega o módulo a cada alteração; sem o cache
// global, cada recarga abriria um pool novo e o Postgres do Supabase esgota
// as conexões em poucos minutos.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
