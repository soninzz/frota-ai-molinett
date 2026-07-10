-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ATENDIMENTO', 'MOTORISTA', 'OPERACIONAL', 'GESTOR_MANUTENCAO', 'FINANCEIRO', 'GESTOR_PRINCIPAL', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('COTACAO', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusOsManutencao" AS ENUM ('SOLICITADO', 'EM_ABERTO', 'AGUARDANDO_PECA', 'AGENDADO', 'EM_EXECUCAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "PrioridadeManutencao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('R', 'D', 'E', 'M', 'DP');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('BOLETO', 'PIX', 'DEBITO_AUTOMATICO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'DINHEIRO');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoPneu" AS ENUM ('TROCA', 'RODIZIO', 'VIRADA');

-- CreateEnum
CREATE TYPE "PosicaoPneu" AS ENUM ('DIANTEIRA_DIREITA', 'DIANTEIRA_ESQUERDA', 'TRACAO_DIREITA_EXTERNA', 'TRACAO_DIREITA_INTERNA', 'TRACAO_ESQUERDA_EXTERNA', 'TRACAO_ESQUERDA_INTERNA', 'TRASEIRA_DIREITA_EXTERNA', 'TRASEIRA_DIREITA_INTERNA', 'TRASEIRA_ESQUERDA_EXTERNA', 'TRASEIRA_ESQUERDA_INTERNA', 'STEP_DIREITA', 'STEP_ESQUERDA', 'ESTEPE');

-- CreateEnum
CREATE TYPE "CanalAlerta" AS ENUM ('WHATSAPP', 'PAINEL', 'EMAIL');

-- CreateEnum
CREATE TYPE "CategoriaAlerta" AS ENUM ('FINANCEIRO', 'OPERACIONAL', 'MANUTENCAO', 'COMERCIAL', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "StatusIntegracao" AS ENUM ('OK', 'ERRO', 'DEGRADADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "whatsappNumero" TEXT,
    "whatsappAtivo" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "motivo" TEXT,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_mock" (
    "id" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "criadoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_mock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracao_logs" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "status" "StatusIntegracao" NOT NULL,
    "detalhes" TEXT,
    "erro" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integracao_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "renavam" TEXT,
    "chassi" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custoKmAtual" DOUBLE PRECISION,
    "custoHoraAtual" DOUBLE PRECISION,
    "custoKmAtualizadoEm" TIMESTAMP(3),

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_revisao" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "kmIntervalo" INTEGER,
    "diasIntervalo" INTEGER,
    "kmProximo" INTEGER,
    "dataProxima" TIMESTAMP(3),
    "kmAlerta" INTEGER NOT NULL DEFAULT 1000,
    "diasAlerta" INTEGER NOT NULL DEFAULT 15,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_revisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_revisoes" (
    "id" TEXT NOT NULL,
    "itemRevisaoId" TEXT NOT NULL,
    "kmNaMoment" INTEGER NOT NULL,
    "dataTroca" TIMESTAMP(3) NOT NULL,
    "fornecedor" TEXT,
    "valor" DOUBLE PRECISION,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_revisoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "kmHodometro" INTEGER NOT NULL,
    "ocrConfianca" DOUBLE PRECISION,
    "painelFotoUrl" TEXT,
    "volumeLitros" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "precoPorLitro" DOUBLE PRECISION NOT NULL,
    "postoCnpj" TEXT,
    "postoNome" TEXT,
    "cupomFotoUrl" TEXT,
    "cupomNfeChave" TEXT,
    "kmRodadoTrecho" INTEGER,
    "consumoKmL" DOUBLE PRECISION,
    "pendenteCupom" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pneus" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "posicaoAtual" "PosicaoPneu",
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tamanho" TEXT NOT NULL,
    "podeVirar" BOOLEAN NOT NULL DEFAULT true,
    "dataCompra" TIMESTAMP(3),
    "valorCompra" DOUBLE PRECISION,
    "fornecedor" TEXT,
    "nfOrigemUrl" TEXT,
    "fotoUrl" TEXT,
    "kmAcumulados" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pneus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_pneu" (
    "id" TEXT NOT NULL,
    "pneuId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoPneu" NOT NULL,
    "posicaoDe" "PosicaoPneu",
    "posicaoPara" "PosicaoPneu",
    "kmNaMomento" INTEGER NOT NULL,
    "fornecedor" TEXT,
    "valor" DOUBLE PRECISION,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pneu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_manutencao" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "solicitanteId" TEXT,
    "status" "StatusOsManutencao" NOT NULL DEFAULT 'SOLICITADO',
    "prioridade" "PrioridadeManutencao" NOT NULL DEFAULT 'BAIXA',
    "descricao" TEXT NOT NULL,
    "subsistema" TEXT,
    "oficina" TEXT,
    "valorEstimado" DOUBLE PRECISION,
    "valorReal" DOUBLE PRECISION,
    "prazoEstimado" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "origemWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "mensagemOrigem" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_manutencao_pecas" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "itemEstoqueId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valorUnitario" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_manutencao_pecas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alinhamentos" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "kmNaMomento" INTEGER NOT NULL,
    "fornecedor" TEXT,
    "valor" DOUBLE PRECISION,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alinhamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_estoque" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "categoria" TEXT,
    "quantidadeAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantidadeMinima" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "fornecedorPref" TEXT,
    "valorMedio" DOUBLE PRECISION,
    "localizacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT,
    "veiculoId" TEXT,
    "valor" DOUBLE PRECISION,
    "origemWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_veiculo" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "alertaDias" INTEGER NOT NULL DEFAULT 30,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguros" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "seguradora" TEXT NOT NULL,
    "apolice" TEXT,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION,
    "cobertura" TEXT,
    "franquia" DOUBLE PRECISION,
    "responsavelAcionamento" TEXT,
    "contatoResponsavel" TEXT,
    "documentoUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multas" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "auto" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataInfracao" TIMESTAMP(3),
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "condutorId" BOOLEAN NOT NULL DEFAULT false,
    "recursoAte" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "cnhCategoria" TEXT NOT NULL,
    "cnhVencimento" TIMESTAMP(3) NOT NULL,
    "toxicologicoVencimento" TIMESTAMP(3),
    "mopp" BOOLEAN NOT NULL DEFAULT false,
    "moppVencimento" TIMESTAMP(3),
    "nr20" BOOLEAN NOT NULL DEFAULT false,
    "nr20Vencimento" TIMESTAMP(3),
    "comissaoPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "regraPrazo" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabela_minima" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorSaida" DOUBLE PRECISION,
    "kmSaida" DOUBLE PRECISION,
    "kmExcedente" DOUBLE PRECISION,
    "htValor" DOUBLE PRECISION,
    "hpValor" DOUBLE PRECISION,
    "mediaKmTotal" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabela_minima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "kmEstimado" DOUBLE PRECISION,
    "tipoServico" TEXT,
    "custoKmSnapshot" DOUBLE PRECISION NOT NULL,
    "custoTotalBase" DOUBLE PRECISION NOT NULL,
    "margemPct" DOUBLE PRECISION NOT NULL,
    "valorFinal" DOUBLE PRECISION NOT NULL,
    "deficitRegistrado" DOUBLE PRECISION,
    "justificativaDeficit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "motivoCancelamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_recuperar" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "saldoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_recuperar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "aprovadorId" TEXT,
    "snapshot" JSONB NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'AGUARDANDO',
    "motivoCancelamento" TEXT,
    "geradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidaEm" TIMESTAMP(3),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "kmInicio" INTEGER,
    "kmFim" INTEGER,
    "kmRodado" INTEGER,
    "iniciadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "htMinutos" INTEGER,
    "hpMotorLigado" INTEGER,
    "hpMotorDesligado" INTEGER,
    "receitaReal" DOUBLE PRECISION,
    "custoReal" DOUBLE PRECISION,
    "margemReal" DOUBLE PRECISION,
    "positivo" BOOLEAN,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horas_extra" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL,
    "valorHora" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horas_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT,
    "conta" TEXT NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_contabeis" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "contas_contabeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataNf" TIMESTAMP(3),
    "nfeChave" TEXT,
    "formaPagamento" "FormaPagamento",
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),
    "contaBancariaId" TEXT NOT NULL,
    "centroCustoId" TEXT,
    "contaContabilId" TEXT,
    "clienteId" TEXT,
    "veiculoId" TEXT,
    "osId" TEXT,
    "osManutencaoId" TEXT,
    "multaId" TEXT,
    "parcelaId" TEXT,
    "observacao" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "periocidade" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" TEXT NOT NULL,
    "credor" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "totalParcelas" INTEGER NOT NULL,
    "taxaJuros" DOUBLE PRECISION,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "emprestimoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "juros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imobilizado" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "veiculoId" TEXT,
    "valorAquisicao" DOUBLE PRECISION NOT NULL,
    "dataAquisicao" TIMESTAMP(3) NOT NULL,
    "vidaUtilMeses" INTEGER NOT NULL,
    "depreciacaoMensal" DOUBLE PRECISION NOT NULL,
    "valorResidual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imobilizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_tributarios" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "pis" DOUBLE PRECISION NOT NULL DEFAULT 0.0065,
    "cofins" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "csll" DOUBLE PRECISION NOT NULL DEFAULT 0.0108,
    "irpj" DOUBLE PRECISION NOT NULL DEFAULT 0.012,
    "iss" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "cbs" DOUBLE PRECISION,
    "ibs" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_operacional" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "faturamentoMinimo" DOUBLE PRECISION NOT NULL,
    "kmMaximo" DOUBLE PRECISION NOT NULL,
    "margemSegurancaPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "mesReferencia" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_operacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras_alerta" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaAlerta" NOT NULL,
    "evento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "destinatariosPerfis" "Perfil"[],
    "canal" "CanalAlerta" NOT NULL DEFAULT 'WHATSAPP',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "configuracao" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_alertas" (
    "id" TEXT NOT NULL,
    "regraId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "canal" "CanalAlerta" NOT NULL,
    "payload" JSONB NOT NULL,
    "entregue" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_registroId_idx" ON "audit_logs"("entidade", "registroId");

-- CreateIndex
CREATE INDEX "audit_logs_usuarioId_idx" ON "audit_logs"("usuarioId");

-- CreateIndex
CREATE INDEX "integracao_logs_fonte_timestamp_idx" ON "integracao_logs"("fonte", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "abastecimentos_veiculoId_timestamp_idx" ON "abastecimentos"("veiculoId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "pneus_codigo_key" ON "pneus"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_usuarioId_key" ON "motoristas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_cpf_key" ON "motoristas"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_cnh_key" ON "motoristas"("cnh");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "tabela_minima_clienteId_key" ON "tabela_minima"("clienteId");

-- CreateIndex
CREATE INDEX "cotacoes_clienteId_idx" ON "cotacoes"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_cotacaoId_key" ON "ordens_servico"("cotacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_osId_key" ON "viagens"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "comissoes_osId_key" ON "comissoes"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "centros_custo_codigo_key" ON "centros_custo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "contas_contabeis_codigo_key" ON "contas_contabeis"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_osId_key" ON "lancamentos"("osId");

-- CreateIndex
CREATE INDEX "lancamentos_vencimento_status_idx" ON "lancamentos"("vencimento", "status");

-- CreateIndex
CREATE INDEX "lancamentos_clienteId_idx" ON "lancamentos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_tributarios_competencia_key" ON "parametros_tributarios"("competencia");

-- CreateIndex
CREATE INDEX "historico_alertas_regraId_enviadoEm_idx" ON "historico_alertas"("regraId", "enviadoEm");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_mock" ADD CONSTRAINT "outbox_mock_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_revisao" ADD CONSTRAINT "itens_revisao_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_revisoes" ADD CONSTRAINT "historico_revisoes_itemRevisaoId_fkey" FOREIGN KEY ("itemRevisaoId") REFERENCES "itens_revisao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneus" ADD CONSTRAINT "pneus_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_pneu" ADD CONSTRAINT "movimentacoes_pneu_pneuId_fkey" FOREIGN KEY ("pneuId") REFERENCES "pneus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_pneu" ADD CONSTRAINT "movimentacoes_pneu_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_manutencao" ADD CONSTRAINT "os_manutencao_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_manutencao_pecas" ADD CONSTRAINT "os_manutencao_pecas_osId_fkey" FOREIGN KEY ("osId") REFERENCES "os_manutencao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_manutencao_pecas" ADD CONSTRAINT "os_manutencao_pecas_itemEstoqueId_fkey" FOREIGN KEY ("itemEstoqueId") REFERENCES "itens_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alinhamentos" ADD CONSTRAINT "alinhamentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_veiculo" ADD CONSTRAINT "documentos_veiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguros" ADD CONSTRAINT "seguros_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multas" ADD CONSTRAINT "multas_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multas" ADD CONSTRAINT "multas_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabela_minima" ADD CONSTRAINT "tabela_minima_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "cotacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas_extra" ADD CONSTRAINT "horas_extra_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contaContabilId_fkey" FOREIGN KEY ("contaContabilId") REFERENCES "contas_contabeis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_osManutencaoId_fkey" FOREIGN KEY ("osManutencaoId") REFERENCES "os_manutencao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_multaId_fkey" FOREIGN KEY ("multaId") REFERENCES "multas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
