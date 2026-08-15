-- CreateEnum
CREATE TYPE "StatusRevenda" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- CreateTable
CREATE TABLE "Revendedor" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "inscricaoEstadual" TEXT,
    "cnae" TEXT,
    "situacao" TEXT,
    "abertura" TIMESTAMP(3),
    "logradouro" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "responsavel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "status" "StatusRevenda" NOT NULL DEFAULT 'PENDENTE',
    "faixa" TEXT,
    "detalhe" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Revendedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Revendedor_cnpj_key" ON "Revendedor"("cnpj");

-- CreateIndex
CREATE INDEX "Revendedor_status_criadoEm_idx" ON "Revendedor"("status", "criadoEm");
