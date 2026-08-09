-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "alturaCm" INTEGER,
ADD COLUMN     "comprimentoCm" INTEGER,
ADD COLUMN     "larguraCm" INTEGER,
ADD COLUMN     "medidasEstimadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pesoGramas" INTEGER;
