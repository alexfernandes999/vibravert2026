-- ERP · fase 1 (espelho do Bling). Idempotente: pode rodar de novo.
CREATE SCHEMA IF NOT EXISTS "erp";

ALTER TABLE "vibravert"."integracoes" ADD COLUMN IF NOT EXISTS "falha" TEXT;
ALTER TABLE "vibravert"."integracoes" ADD COLUMN IF NOT EXISTS "falhaEm" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "erp"."espelho_bling" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "blingId" TEXT NOT NULL,
    "codigo" TEXT,
    "resumo" JSONB NOT NULL,
    "dados" JSONB,
    "pendente" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT NOT NULL,
    "lidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mudouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "espelho_bling_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "erp"."fontes_bling" (
    "entidade" TEXT NOT NULL,
    "pagina" INTEGER NOT NULL DEFAULT 1,
    "varreduraDe" TIMESTAMP(3),
    "completaEm" TIMESTAMP(3),
    "desde" TIMESTAMP(3),
    "registros" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "erroEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fontes_bling_pkey" PRIMARY KEY ("entidade")
);
CREATE INDEX IF NOT EXISTS "espelho_bling_entidade_codigo_idx" ON "erp"."espelho_bling"("entidade", "codigo");
CREATE INDEX IF NOT EXISTS "espelho_bling_entidade_pendente_idx" ON "erp"."espelho_bling"("entidade", "pendente");
CREATE UNIQUE INDEX IF NOT EXISTS "espelho_bling_entidade_blingId_key" ON "erp"."espelho_bling"("entidade", "blingId");

-- Dados financeiros e de clientes: fora da API pública do Supabase.
ALTER TABLE "erp"."espelho_bling" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "erp"."fontes_bling" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA "erp" FROM anon, authenticated;
REVOKE USAGE ON SCHEMA "erp" FROM anon, authenticated;
