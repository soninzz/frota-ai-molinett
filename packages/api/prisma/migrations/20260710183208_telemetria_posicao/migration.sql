-- CreateTable
CREATE TABLE "telemetria_posicoes" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "velocidade" DOUBLE PRECISION NOT NULL,
    "motorLigado" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemetria_posicoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetria_posicoes_viagemId_timestamp_idx" ON "telemetria_posicoes"("viagemId", "timestamp");

-- AddForeignKey
ALTER TABLE "telemetria_posicoes" ADD CONSTRAINT "telemetria_posicoes_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetria_posicoes" ADD CONSTRAINT "telemetria_posicoes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
