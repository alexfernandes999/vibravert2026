-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "lembreteEm" TIMESTAMP(3),
ADD COLUMN     "lembretes" INTEGER NOT NULL DEFAULT 0;
