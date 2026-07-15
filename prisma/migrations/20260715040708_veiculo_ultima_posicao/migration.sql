-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "ultimaLatitude" DOUBLE PRECISION,
ADD COLUMN     "ultimaLongitude" DOUBLE PRECISION,
ADD COLUMN     "ultimaPosicaoEm" TIMESTAMP(3),
ADD COLUMN     "ultimaPosicaoFonte" TEXT,
ADD COLUMN     "ultimaVelocidade" DOUBLE PRECISION,
ADD COLUMN     "ultimoMotorLigado" BOOLEAN;
