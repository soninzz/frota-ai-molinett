// ============================================================
// Frota AI — Transportes Molinett
// Seed inicial do banco de dados
// prisma/seed.ts
// ============================================================
// Rodar com: npx prisma db seed
// ============================================================

import { PrismaClient, Perfil, CanalAlerta, CategoriaAlerta } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ============================================================
  // 1. VEÍCULOS DA FROTA
  // ============================================================
  console.log('🚛 Criando veículos...')

  const veiculos = await Promise.all([
    prisma.veiculo.upsert({
      where: { placa: 'MLC' },
      update: {},
      create: {
        placa: 'MLC',
        modelo: 'FH 460',
        marca: 'Volvo',
        ano: 2019,
        ativo: true,
      },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'AAW' },
      update: {},
      create: {
        placa: 'AAW',
        modelo: 'Actros 2651',
        marca: 'Mercedes-Benz',
        ano: 2018,
        ativo: true,
      },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'MHG' },
      update: {},
      create: {
        placa: 'MHG',
        modelo: 'Constellation 26.420',
        marca: 'Volkswagen',
        ano: 2020,
        ativo: true,
      },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'IFF' },
      update: {},
      create: {
        placa: 'IFF',
        modelo: 'FH 500',
        marca: 'Volvo',
        ano: 2021,
        ativo: true,
      },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'IQU' },
      update: {},
      create: {
        placa: 'IQU',
        modelo: 'Actros 2646',
        marca: 'Mercedes-Benz',
        ano: 2017,
        ativo: true,
      },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'RLI' },
      update: {},
      create: {
        placa: 'RLI',
        modelo: 'TGX 29.480',
        marca: 'MAN',
        ano: 2022,
        ativo: true,
      },
    }),
  ])

  console.log(`   ✅ ${veiculos.length} veículos criados`)

  // ============================================================
  // 2. ITENS DE REVISÃO POR VEÍCULO
  // ============================================================
  console.log('🔧 Criando itens de revisão...')

  const itensRevisaoPadrao = [
    { nome: 'Óleo motor',              kmIntervalo: 15000, diasIntervalo: 180 },
    { nome: 'Filtro de óleo',          kmIntervalo: 15000, diasIntervalo: 180 },
    { nome: 'Filtro de ar',            kmIntervalo: 30000, diasIntervalo: 365 },
    { nome: 'Filtro Racor',            kmIntervalo: 15000, diasIntervalo: 90  },
    { nome: 'Filtro de cabine',        kmIntervalo: 30000, diasIntervalo: 365 },
    { nome: 'Filtro pneumático',       kmIntervalo: 60000, diasIntervalo: 730 },
    { nome: 'Filtro hidráulico',       kmIntervalo: 60000, diasIntervalo: 730 },
    { nome: 'Compressor desumidificador', kmIntervalo: 60000, diasIntervalo: 730 },
    { nome: 'Óleo transmissão',        kmIntervalo: 60000, diasIntervalo: 730 },
    { nome: 'Óleo diferencial',        kmIntervalo: 60000, diasIntervalo: 730 },
    { nome: 'Correia dentada',         kmIntervalo: 80000, diasIntervalo: null },
    { nome: 'Freios dianteiros',       kmIntervalo: 60000, diasIntervalo: null },
    { nome: 'Freios traseiros',        kmIntervalo: 60000, diasIntervalo: null },
  ]

  for (const veiculo of veiculos) {
    for (const item of itensRevisaoPadrao) {
      await prisma.itemRevisao.create({
        data: {
          veiculoId: veiculo.id,
          nome: item.nome,
          kmIntervalo: item.kmIntervalo,
          diasIntervalo: item.diasIntervalo,
          kmAlerta: 1000,
          diasAlerta: 15,
          ativo: true,
        },
      })
    }
  }

  console.log(`   ✅ ${itensRevisaoPadrao.length * veiculos.length} itens de revisão criados`)

  // ============================================================
  // 3. CONTAS BANCÁRIAS
  // ============================================================
  console.log('🏦 Criando contas bancárias...')

  const contasPadrao = [
    { banco: 'Sicoob',  agencia: null, conta: 'principal', tipo: 'corrente',    descricao: 'Conta principal operacional' },
    { banco: 'Inter',   agencia: null, conta: 'inter-pj',  tipo: 'corrente',    descricao: 'Conta Inter PJ' },
    { banco: 'Inter',   agencia: null, conta: 'cartao',    tipo: 'credito',     descricao: 'Cartão combustível Inter' },
    { banco: 'Caixa',   agencia: null, conta: 'caixa',     tipo: 'corrente',    descricao: 'Caixa interno' },
  ]

  const contas = await Promise.all(
    contasPadrao.map(c =>
      prisma.contaBancaria.create({ data: c })
    )
  )

  console.log(`   ✅ ${contas.length} contas bancárias criadas`)

  // ============================================================
  // 4. CENTROS DE CUSTO (plano de contas — veículos 9–22 + admin)
  // ============================================================
  console.log('📊 Criando centros de custo...')

  const centrosCusto = [
    { codigo: '9',  nome: 'MLC',            tipo: 'veiculo'        },
    { codigo: '10', nome: 'AAW',            tipo: 'veiculo'        },
    { codigo: '11', nome: 'MHG',            tipo: 'veiculo'        },
    { codigo: '12', nome: 'IFF',            tipo: 'veiculo'        },
    { codigo: '13', nome: 'IQU',            tipo: 'veiculo'        },
    { codigo: '14', nome: 'RLI',            tipo: 'veiculo'        },
    { codigo: '20', nome: 'Administrativo', tipo: 'administrativo' },
    { codigo: '21', nome: 'Financeiro',     tipo: 'financeiro'     },
    { codigo: '22', nome: 'Variável',       tipo: 'administrativo' },
  ]

  await Promise.all(
    centrosCusto.map(cc =>
      prisma.centroCusto.upsert({
        where: { codigo: cc.codigo },
        update: {},
        create: cc,
      })
    )
  )

  console.log(`   ✅ ${centrosCusto.length} centros de custo criados`)

  // ============================================================
  // 5. CONTAS CONTÁBEIS (grupos do plano de contas)
  // ============================================================
  console.log('📒 Criando contas contábeis...')

  const contasContabeis = [
    // Receitas
    { codigo: 'REC-01', nome: 'Receita de Fretes',           grupo: 'REC',  tipo: 'receita'  },
    { codigo: 'REC-02', nome: 'Receita de Diárias',          grupo: 'REC',  tipo: 'receita'  },
    { codigo: 'REC-03', nome: 'Receita Diversa',             grupo: 'REC',  tipo: 'receita'  },
    // CPV
    { codigo: 'CPV-01', nome: 'Combustível',                 grupo: 'CPV',  tipo: 'despesa'  },
    { codigo: 'CPV-02', nome: 'Manutenção',                  grupo: 'CPV',  tipo: 'despesa'  },
    { codigo: 'CPV-03', nome: 'Pneus',                       grupo: 'CPV',  tipo: 'despesa'  },
    { codigo: 'CPV-04', nome: 'Comissões Motoristas',        grupo: 'CPV',  tipo: 'despesa'  },
    { codigo: 'CPV-05', nome: 'Pedágios',                    grupo: 'CPV',  tipo: 'despesa'  },
    { codigo: 'CPV-06', nome: 'Ajuda de Custo',              grupo: 'CPV',  tipo: 'despesa'  },
    // Administrativo
    { codigo: 'ADM-01', nome: 'Salários',                    grupo: 'ADM',  tipo: 'despesa'  },
    { codigo: 'ADM-02', nome: 'FGTS',                        grupo: 'ADM',  tipo: 'despesa'  },
    { codigo: 'ADM-03', nome: 'INSS',                        grupo: 'ADM',  tipo: 'despesa'  },
    { codigo: 'ADM-04', nome: 'Aluguel',                     grupo: 'ADM',  tipo: 'despesa'  },
    { codigo: 'ADM-05', nome: 'Energia / Água / Internet',   grupo: 'ADM',  tipo: 'despesa'  },
    { codigo: 'ADM-06', nome: 'Material de Escritório',      grupo: 'ADM',  tipo: 'despesa'  },
    // Financeiro
    { codigo: 'FIN-01', nome: 'Juros e IOF',                 grupo: 'FIN',  tipo: 'despesa'  },
    { codigo: 'FIN-02', nome: 'Parcelas de Empréstimo',      grupo: 'FIN',  tipo: 'despesa'  },
    { codigo: 'FIN-03', nome: 'Rendimento de Aplicação',     grupo: 'FIN',  tipo: 'receita'  },
    // Tributário
    { codigo: 'TRIB-01', nome: 'ISS',                        grupo: 'TRIB', tipo: 'despesa'  },
    { codigo: 'TRIB-02', nome: 'IRPJ',                       grupo: 'TRIB', tipo: 'despesa'  },
    { codigo: 'TRIB-03', nome: 'CSLL',                       grupo: 'TRIB', tipo: 'despesa'  },
    { codigo: 'TRIB-04', nome: 'PIS',                        grupo: 'TRIB', tipo: 'despesa'  },
    { codigo: 'TRIB-05', nome: 'COFINS',                     grupo: 'TRIB', tipo: 'despesa'  },
    { codigo: 'TRIB-06', nome: 'IPVA',                       grupo: 'TRIB', tipo: 'despesa'  },
    // Variável / Produção
    { codigo: 'VAR-01', nome: 'Seguros',                     grupo: 'VAR',  tipo: 'despesa'  },
    { codigo: 'VAR-02', nome: 'Multas',                      grupo: 'VAR',  tipo: 'despesa'  },
    { codigo: 'VAR-03', nome: 'Licenciamento',               grupo: 'VAR',  tipo: 'despesa'  },
    { codigo: 'PROD-01', nome: 'Depreciação',                grupo: 'PROD', tipo: 'despesa'  },
    { codigo: 'PROD-02', nome: 'Terceiros / Frete',          grupo: 'PROD', tipo: 'despesa'  },
  ]

  await Promise.all(
    contasContabeis.map(cc =>
      prisma.contaContabil.upsert({
        where: { codigo: cc.codigo },
        update: {},
        create: cc,
      })
    )
  )

  console.log(`   ✅ ${contasContabeis.length} contas contábeis criadas`)

  // ============================================================
  // 6. CLIENTES COM REGRAS DE PRAZO
  // Extraídos da aba DATAS das planilhas — escopo v3
  // ============================================================
  console.log('👥 Criando clientes...')

  const clientes = [
    { nome: 'Movida',             cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'SAT',                cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Localiza',           cnpj: null, regraPrazo: { tipo: 'dias',    valor: 14                    } },
    { nome: 'Gente',              cnpj: null, regraPrazo: { tipo: 'dias_mes', dias: [20, 30, 10]           } },
    { nome: 'SOON',               cnpj: null, regraPrazo: { tipo: 'dia_mes', dia: 5,  proximo_mes: true    } },
    { nome: 'DAF',                cnpj: null, regraPrazo: { tipo: 'dia_mes', dia: 20, proximo_mes: true    } },
    { nome: 'MAWDY',              cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'ANTRAC',             cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Porto Seguro',       cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Yelum',              cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Tokio Marine',       cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Europ Assistance',   cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'USS',                cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Facil Assist',       cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'AWP',                cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'TAG',                cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'ABC',                cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Jardel Stefanski',   cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Parron',             cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Transportes Joana',  cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'Copart',             cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
    { nome: 'M&P Filhos',         cnpj: null, regraPrazo: { tipo: 'dias',    valor: 30                    } },
  ]

  await Promise.all(
    clientes.map(c =>
      prisma.cliente.create({ data: c })
    )
  )

  console.log(`   ✅ ${clientes.length} clientes criados`)

  // ============================================================
  // 7. PARÂMETROS TRIBUTÁRIOS 2026
  // Reforma tributária — CBS em teste (0,9%) + IBS (0,1%)
  // ============================================================
  console.log('📋 Criando parâmetros tributários...')

  const meses2026 = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
  ]

  await Promise.all(
    meses2026.map(competencia =>
      prisma.parametroTributario.upsert({
        where: { competencia },
        update: {},
        create: {
          competencia,
          pis:    0.0065,  // 0,65%
          cofins: 0.0300,  // 3%
          csll:   0.0108,  // 1,08%
          irpj:   0.0120,  // 1,2%
          iss:    0.0200,  // 2%
          cbs:    0.0090,  // 0,9% — ano-teste 2026 (LC 214/2025 art. 348)
          ibs:    0.0010,  // 0,1% — ano-teste 2026
        },
      })
    )
  )

  console.log(`   ✅ Parâmetros tributários 2026 criados`)

  // ============================================================
  // 8. META OPERACIONAL INICIAL (singleton)
  // Valores placeholder — serão recalculados pelo cron do S05
  // ============================================================
  console.log('🎯 Criando meta operacional...')

  await prisma.metaOperacional.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: {
      id:                 'singleton',
      faturamentoMinimo:  0,     // recalculado diariamente pelo S05
      kmMaximo:           0,     // recalculado diariamente pelo S05
      margemSegurancaPct: 10,    // 10% de margem de segurança (configurável)
      mesReferencia:      '2026-06',
    },
  })

  console.log(`   ✅ Meta operacional criada`)

  // ============================================================
  // 9. SALDO A RECUPERAR (singleton)
  // ============================================================
  console.log('💰 Criando conta de saldo a recuperar...')

  await prisma.saldoRecuperar.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: {
      id:         'singleton',
      saldoTotal: 0,
    },
  })

  console.log(`   ✅ Conta de saldo a recuperar criada`)

  // ============================================================
  // 10. REGRAS DE ALERTA (motor de alertas — S02)
  // ============================================================
  console.log('🔔 Criando regras de alerta...')

  const regrasAlerta = [
    // Financeiro
    {
      categoria:           CategoriaAlerta.FINANCEIRO,
      evento:              'CONTA_A_VENCER',
      descricao:           'Conta a vencer em 1 dia',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL, Perfil.FINANCEIRO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 1 },
    },
    {
      categoria:           CategoriaAlerta.FINANCEIRO,
      evento:              'CONTA_ATRASADA',
      descricao:           'Conta com pagamento em atraso',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL, Perfil.FINANCEIRO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    {
      categoria:           CategoriaAlerta.FINANCEIRO,
      evento:              'RECEBIMENTO_ATRASADO',
      descricao:           'Cliente não pagou na data prevista',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL, Perfil.FINANCEIRO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    // Operacional
    {
      categoria:           CategoriaAlerta.OPERACIONAL,
      evento:              'OS_CANCELADA',
      descricao:           'Ordem de serviço cancelada',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    {
      categoria:           CategoriaAlerta.OPERACIONAL,
      evento:              'OS_CRIADA',
      descricao:           'Nova OS gerada',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL, Perfil.OPERACIONAL],
      canal:               CanalAlerta.PAINEL,
      configuracao:        {},
    },
    // Manutenção
    {
      categoria:           CategoriaAlerta.MANUTENCAO,
      evento:              'REVISAO_A_VENCER',
      descricao:           'Item de revisão próximo do vencimento',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaKm: 1000, antecedenciaDias: 15 },
    },
    {
      categoria:           CategoriaAlerta.MANUTENCAO,
      evento:              'CONSUMO_ANOMALO',
      descricao:           'Consumo de combustível fora da média',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { variacaoMinimaPct: 15 },
    },
    {
      categoria:           CategoriaAlerta.MANUTENCAO,
      evento:              'ESTOQUE_CRITICO',
      descricao:           'Peça abaixo do estoque mínimo',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    {
      categoria:           CategoriaAlerta.MANUTENCAO,
      evento:              'ABASTECIMENTO_SEM_CUPOM',
      descricao:           'Abastecimento registrado sem cupom fiscal',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    // Comercial
    {
      categoria:           CategoriaAlerta.COMERCIAL,
      evento:              'MARGEM_NEGATIVA_TENTATIVA',
      descricao:           'Tentativa de cotação com margem negativa',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
    {
      categoria:           CategoriaAlerta.COMERCIAL,
      evento:              'META_FATURAMENTO_EM_RISCO',
      descricao:           'Meta de faturamento mensal em risco',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL, Perfil.ATENDIMENTO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { limiarPct: 80 },
    },
    // Compliance
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'CNH_A_VENCER',
      descricao:           'CNH de motorista próxima do vencimento',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.MOTORISTA],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 60 },
    },
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'TOXICOLOGICO_A_VENCER',
      descricao:           'Exame toxicológico a vencer (alerta 60/30 dias)',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.MOTORISTA],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 60 },
    },
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'TACOGRAFO_AFERIÇÃO_A_VENCER',
      descricao:           'Aferição do tacógrafo a vencer (ciclo 2 anos)',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 30 },
    },
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'MOPP_A_VENCER',
      descricao:           'Certificação MOPP do motorista a vencer',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.MOTORISTA],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 30 },
    },
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'NR20_A_VENCER',
      descricao:           'Certificação NR-20 do motorista a vencer',
      destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.MOTORISTA],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        { antecedenciaDias: 30 },
    },
    {
      categoria:           CategoriaAlerta.COMPLIANCE,
      evento:              'MULTA_NOVA',
      descricao:           'Nova multa registrada no sistema',
      destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL],
      canal:               CanalAlerta.WHATSAPP,
      configuracao:        {},
    },
  ]

  await Promise.all(
    regrasAlerta.map(r =>
      prisma.regraAlerta.create({ data: r })
    )
  )

  console.log(`   ✅ ${regrasAlerta.length} regras de alerta criadas`)

  // ============================================================
  // 11. USUÁRIO ADMIN INICIAL
  // Trocar a senha imediatamente após o primeiro login!
  // ============================================================
  console.log('👤 Criando usuário administrador...')

  const senhaInicial = process.env.SEED_ADMIN_PASSWORD
  if (!senhaInicial) {
    throw new Error(
      'SEED_ADMIN_PASSWORD não definida no .env — defina antes de rodar o seed (evita senha hardcoded no git).',
    )
  }
  const senhaHash = await bcrypt.hash(senhaInicial, 12)

  await prisma.usuario.upsert({
    where: { email: 'admin@molinett.com.br' },
    update: {},
    create: {
      nome:    'Administrador',
      email:   'admin@molinett.com.br',
      senhaHash,
      perfil:  Perfil.ADMINISTRADOR,
      ativo:   true,
    },
  })

  console.log(`   ✅ Usuário admin criado — email: admin@molinett.com.br`)
  console.log(`   ⚠️  TROCAR A SENHA NO PRIMEIRO LOGIN!`)

  // ============================================================
  // RESUMO FINAL
  // ============================================================
  console.log('\n✅ Seed concluído com sucesso!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🚛 Veículos:           ${veiculos.length}`)
  console.log(`🔧 Itens de revisão:   ${itensRevisaoPadrao.length * veiculos.length}`)
  console.log(`🏦 Contas bancárias:   ${contas.length}`)
  console.log(`📊 Centros de custo:   ${centrosCusto.length}`)
  console.log(`📒 Contas contábeis:   ${contasContabeis.length}`)
  console.log(`👥 Clientes:           ${clientes.length}`)
  console.log(`🔔 Regras de alerta:   ${regrasAlerta.length}`)
  console.log(`👤 Usuário admin:      1`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })