-- CreateEnum
CREATE TYPE "TipoSinistro" AS ENUM ('COLISAO', 'ROUBO_FURTO', 'INCENDIO', 'DANOS_TERCEIROS', 'PANE', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusSinistro" AS ENUM ('ABERTO', 'ACIONADO', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "sinistros" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "seguroId" TEXT,
    "tipo" "TipoSinistro" NOT NULL,
    "status" "StatusSinistro" NOT NULL DEFAULT 'ABERTO',
    "dataOcorrencia" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "descricao" TEXT NOT NULL,
    "boletimUrl" TEXT,
    "protocolo" TEXT,
    "franquiaValor" DOUBLE PRECISION,
    "valorOrcado" DOUBLE PRECISION,
    "valorIndenizado" DOUBLE PRECISION,
    "terceiroEnvolvido" BOOLEAN NOT NULL DEFAULT false,
    "terceiroDados" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sinistros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sinistro_eventos" (
    "id" TEXT NOT NULL,
    "sinistroId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sinistro_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cenarios_simulacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "premissas" JSONB NOT NULL,
    "resultado" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cenarios_simulacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sinistros_veiculoId_idx" ON "sinistros"("veiculoId");

-- CreateIndex
CREATE INDEX "sinistros_status_idx" ON "sinistros"("status");

-- CreateIndex
CREATE INDEX "sinistro_eventos_sinistroId_criadoEm_idx" ON "sinistro_eventos"("sinistroId", "criadoEm");

-- AddForeignKey
ALTER TABLE "sinistros" ADD CONSTRAINT "sinistros_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinistros" ADD CONSTRAINT "sinistros_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinistros" ADD CONSTRAINT "sinistros_seguroId_fkey" FOREIGN KEY ("seguroId") REFERENCES "seguros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinistro_eventos" ADD CONSTRAINT "sinistro_eventos_sinistroId_fkey" FOREIGN KEY ("sinistroId") REFERENCES "sinistros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_alertas" ADD CONSTRAINT "historico_alertas_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "regras_alerta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
