-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('BOMBA', 'PECA', 'KIT_AVULSO', 'ACESSORIO');

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "tipo" "TipoProduto" NOT NULL DEFAULT 'BOMBA';
