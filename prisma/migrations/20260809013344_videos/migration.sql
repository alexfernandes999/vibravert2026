-- CreateEnum
CREATE TYPE "TipoVideo" AS ENUM ('PRODUTO', 'PROBLEMA');

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT,
    "tipo" "TipoVideo" NOT NULL DEFAULT 'PRODUTO',
    "familia" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_youtubeId_key" ON "videos"("youtubeId");

-- CreateIndex
CREATE INDEX "videos_tipo_ativo_ordem_idx" ON "videos"("tipo", "ativo", "ordem");

-- CreateIndex
CREATE INDEX "videos_familia_idx" ON "videos"("familia");
