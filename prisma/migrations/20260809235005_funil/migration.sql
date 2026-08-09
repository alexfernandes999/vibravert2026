-- CreateEnum
CREATE TYPE "EtapaFunil" AS ENUM ('VISITA', 'PRODUTO', 'CARRINHO', 'CHECKOUT', 'PEDIDO');

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "origem" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "sessao" TEXT NOT NULL,
    "etapa" "EtapaFunil" NOT NULL,
    "origem" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "uf" CHAR(2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_etapa_criadoEm_idx" ON "eventos"("etapa", "criadoEm");

-- CreateIndex
CREATE INDEX "eventos_sessao_idx" ON "eventos"("sessao");
