-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "kmAtual" INTEGER,
ADD COLUMN     "kmAtualEm" TIMESTAMP(3),
ADD COLUMN     "kmAtualFonte" TEXT,
ADD COLUMN     "tacografoAfericaoVencimento" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "regras_permissao" (
    "id" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "recurso" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL,
    "atualizadoPor" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_permissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regras_permissao_perfil_recurso_key" ON "regras_permissao"("perfil", "recurso");
