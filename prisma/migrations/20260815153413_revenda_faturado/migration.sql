-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "documentos" TEXT[],
ADD COLUMN     "querFaturado" BOOLEAN NOT NULL DEFAULT false;
