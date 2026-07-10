@AGENTS.md

# Frota AI · Transportes Molinett — Contexto do Projeto

Este arquivo existe para dar contexto a qualquer sessão do Claude Code que trabalhar
neste repositório. Leia isto antes de mexer em qualquer coisa.

## O que é o projeto

Sistema de gestão operacional para a Transportes Molinett (transporte rodoviário/guincho),
baseado no "Escopo Técnico v3" (documento anexo ao contrato). 5 sistemas integrados:

- **S01** — Cotação (calculadora de margem, gera Ordem de Serviço)
- **S03** — Frota (veículos, manutenção, diesel, pneus)
- **S04** — Jornada (viagens, motoristas, comissões)
- **S05** — Financeiro (fluxo de caixa, lançamentos, metas dinâmicas)
- **S02** — WhatsApp (motor de alertas — construído; canal de envio ainda não conectado)

## Stack

- Monorepo: `packages/api` (NestJS + Prisma), `packages/web` (Next.js App Router, sem `src/`)
- Banco: Supabase (PostgreSQL), pooler na porta 6543 pra runtime, direct na 5432 pra migrations
- Auth: **JWT próprio** (bcrypt + NestJS Passport) — **NÃO é Supabase Auth**, decisão consciente
  confirmada com o time (ver seção "Decisões em aberto" abaixo)
- Frontend: design system com paleta real da marca Molinett — azul `#1E4C8C`, vermelho `#C0392B`
  (extraídos do logo real, não são cores genéricas)

## Status atual (real, não otimista)

### Completo e testado
- Todas as 16+ telas do núcleo (cotação, frota, jornada, financeiro, cadastros, aprovação de
  margem negativa, pneus, alertas)
- Fluxo de negócio completo testado: cotação → OS → viagem → comissão → financeiro
- Motor de alertas interno (grava no banco, aparece em `/alertas` — ainda não envia WhatsApp)
- Autenticação JWT funcionando (login, RBAC por perfil)

### Em andamento / bloqueado
- **Rastreador Assemilsat**: **FUNCIONANDO EM MODO LIVE** (2026-07-10). Autenticação validada
  contra a API real: POST form-urlencoded com `usuario`/`senha` no corpo (não é Basic Auth).
  `rastreador.service.ts` implementa o fluxo real com resposta tipada; `rastreador.scheduler.ts`
  roda a cada 5 min (só em TRACKER_MODE=live). Atenção: `/integracao/posicoes` NÃO é
  idempotente — cada chamada consome a fila de posições novas (janela 48h, lotes de 400).
- **Rastreador MegaSat/STC**: autenticação confirmada (MD5, chave de integração), mas a
  documentação de endpoints (`ap2.stc.srv.br/docs/`) está dando 404 — aguardando suporte STC.
- **WhatsApp via Evolution API** (não é a API oficial da Meta — decisão do cliente, registrada
  e aceita apesar do risco de banimento). Instância `Diga3` criada, mas travada: WhatsApp recusa
  conectar novo dispositivo ("não é possível conectar no momento") — provável versão desatualizada
  do Baileys no servidor Evolution, depende de quem administra o servidor (easypanel.host).

### Pendência de dado — placas dos veículos
O banco tinha 6 veículos com placa cadastrada como CÓDIGO CURTO (`MHG`, `IFF`, `MLC`, `AAW`, `IQU`,
`RLI`) em vez da placa real completa. O Assemilsat retorna placas completas (ex: `MHG-1A49`).
**Decisão tomada**: trocar a placa no banco pro formato completo (mais simples que criar vínculo
por ID externo). Já aplicado no banco (2026-07-10):
- MHG → MHG-1A49 ✅
- IFF → IFF-3I63 ✅
- MLC → MLC-1A51 ✅
- AAW, IQU, RLI → **ainda pendentes** (código curto no banco), pegar via endpoint `listarVeiculos`
  do Assemilsat. Nota: o fluxo de autenticação real (form-data `usuario`/`senha`) mencionado aqui
  não está implementado em nenhum lugar do repo — `rastreador.service.ts` só tem uma chamada
  Basic Auth contra `/integracao/posicoes` marcada no próprio código como suposição não
  confirmada. Precisa validar o endpoint/auth de verdade (Postman ou com quem confirmou
  originalmente) antes de buscar essas 3 placas.

### Concluído em 2026-07-10
- **Scheduler/cron**: `@nestjs/schedule` instalado; `RastreadorScheduler` sincroniza posições
  a cada 5 min (com guarda de reentrância e skip em modo mock)
- **Módulo de sinistros** (`/sinistros` API + tela `/frota/sinistros`): CRUD com workflow de
  status (ABERTO→ACIONADO→EM_ANALISE→APROVADO/RECUSADO→ENCERRADO), timeline de eventos,
  vínculo com veículo/motorista/apólice, resumo com valores. Sem integração com APIs de
  seguradora (credenciais recebidas são de portais, não de API)
- **S05 Simulador financeiro** (`/simulador` API + tela `/financeiro/simulador`): baseline
  automático dos últimos 90 dias, projeção mês a mês com premissas ajustáveis (variação de
  receita/custo, preço do diesel, km/mês, custo extra), cenários salvos e comparador lado a lado
- **S04 Lei do Motorista** (`/jornada/lei-motorista` + `/jornada/horas-extra/por-classe` +
  tela): violações de direção diária (>10h/dia) e interjornada (<11h) por motorista; hora extra
  agrupada por classe (campo `tipo` de `HoraExtra`) e por motorista. Direção contínua (5h30)
  ainda não é verificável — exige persistir posição a posição do rastreador
- **Módulo de alertas corrigido**: arquivo renomeado pra `alertas.service.ts` e relation
  `HistoricoAlerta.regra` adicionada no schema (migration aplicada)

### Concluído em 2026-07-10 (segunda rodada — pós-docs do escopo)
- **S05 completo**: taxas reais do BCB SGS (CDI série 12, Selic série 11, cache 6h, fallback),
  simulador de financiamento ("posso assumir parcela de R$ X?" → meses em risco + aumento de
  meta) e comparador aplicar×antecipar×reinvestir com TIR/VPL/payback (recomendação por VPL,
  CDI como taxa de desconto). Endpoints: `/simulador/taxas`, `/simulador/financiamento`,
  `/simulador/comparar-investimento`. UI na tela do simulador.
- **S04 ampliado**: violação de descanso semanal (35h contínuas por janela de 7 dias) no
  relatório da Lei do Motorista + endpoint `/jornada/lei-motorista/verificar/:motoristaId`
  (interjornada 11h + viagem em andamento + sugestão de motoristas alternativos) pra usar na
  alocação de OS. Classes de hora extra já conformes (diurna/noturna/feriado/domingo no DTO).
- **Resumos diários** (Escopo §S02): crons 07h gestor / 07h30 manutenção / 08h atendimento
  (`resumos.scheduler.ts`), gravando no painel de alertas via regras auto-criadas; quando o
  WhatsApp conectar, o mesmo disparo passa a enviar mensagem.
- **Git**: repositório inicializado (branch main), commit inicial limpo — `.env` fora do git,
  `.env.example` como contrato de variáveis.
- **Deploy web na Vercel**: projeto `molinett` (team digaaisuporte-4949s-projects), produção em
  `molinett.vercel.app`, domínio `molinett.frotaai.com` adicionado ao projeto.
  **DNS pendente do cliente**: CNAME `molinett` → `210f71e8bbc09d95.vercel-dns-017.com`
  (fallback: `cname.vercel-dns.com`). Token Vercel fornecido pelo cliente (não comitar).

### Não iniciado / pendente
- **API em produção**: NestJS NÃO roda na Vercel — plano original é Railway. Enquanto não
  houver API hospedada, o site em produção não loga (NEXT_PUBLIC_API_URL aponta pra
  localhost). Próximo passo do deploy.
- **Supabase Auth**: cliente confirmou que quer "supabase auth normal" pro plano multi-domínio
  (molinett.frotaai.com / franco.frotaai.com). Migração JWT→Supabase Auth planejada, ainda
  não iniciada — é refactor grande (auth module, guards, frontend, seeds).
- OCR de hodômetro/cupom fiscal (falta decidir/obter chaves)
- SEFAZ (certificado digital ainda não confirmado)
- **Conflito a resolver com o cliente**: o Escopo v3/critérios de aceite exigem WhatsApp
  **oficial da Meta** (guardrail: "nada de WhatsApp não-oficial"), mas a decisão registrada
  foi Evolution API. Re-confirmar antes do go-live — critério de aceite cita Cloud API.
- Senha do seed do admin (`SENHA_REMOVIDA_DO_HISTORICO_GIT`) está em `prisma/seed.ts` no git — trocar a senha
  do admin em produção no primeiro login.

## Decisões em aberto (não decidir sozinho, perguntar)

1. **Autenticação**: alguém (apelidado "Marco"/"G Linkedin" nas conversas) mencionou querer
   "Supabase Auth normal" para um plano de deploy multi-domínio (`molinett.frotaai.com`,
   `franco.frotaai.com`). Ficou definido que JWT próprio não impede deploy no Vercel — a
   pergunta que falta responder é *por que* ele quer Supabase Auth especificamente (SSO entre
   domínios? magic link?). Não migrar sem confirmar o motivo real.

2. **JWT_SECRET**: o valor no `.env` era um placeholder óbvio
   (`"...trocar-em-producao"`) — **precisa ser trocado por um valor aleatório real antes do
   deploy**. Gerar com: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## Erros recorrentes ao colar código (ficar atento)

Historicamente, colar blocos de código gerados em chat causou bugs por:
- Métodos duplicados (`criar()` colado duas vezes no mesmo arquivo)
- Imports duplicados na mesma classe
- Arquivos indo pro caminho errado (ex: `Shell.tsx` foi parar dentro de `packages/api` por engano)
- Path relativo errado (`../database/` vs `./database/` dependendo da profundidade da pasta)

Claude Code, por editar o arquivo direto, deve evitar esses problemas — mas vale sempre rodar
o build/lint depois de qualquer edição pra confirmar.

## Projeto irmão: Franco Transportes

Projeto separado (`frota-ai-franco`, se existir), 7 sistemas diferentes (Status Frota, Acerto
Multimoeda, Fechamento de Média, CT-e, Auditor de Jornada, Dashboard Conversacional, Financeira
Preditiva). Rastreador real: Sascar (doc SasIntegra confirmada) + Golbrax (API não confirmada).
CT-e está em standby a pedido do cliente. Não confundir escopo/credenciais dos dois projetos.