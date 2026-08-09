-- CreateEnum
CREATE TYPE "Versao" AS ENUM ('BOMBA', 'BOIA', 'KIT', 'BOIA_KIT');

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "familia" TEXT,
ADD COLUMN     "principalDaFamilia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "versao" "Versao" NOT NULL DEFAULT 'BOMBA';

-- CreateIndex
CREATE INDEX "produtos_familia_versao_idx" ON "produtos"("familia", "versao");
