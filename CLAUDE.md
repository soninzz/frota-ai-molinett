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
- Frontend: design system com paleta real da marca Molinett — laranja `#E63A1F` (medido por
  pixel-sampling do logo real em `packages/web/public/logo-molinett.png`, não é cor genérica;
  o azul `#1E4C8C` documentado aqui antes era um placeholder incorreto), vermelho `#C0392B`
  para estados de alerta/erro. Grid texture sutil (`.bg-grid`/`.bg-grid-dark` em `globals.css`)
  e cards com barra de cor à esquerda (accent bar) no padrão visual "futurista/editorial"
  aplicado em 2026-07-17 em todas as telas.

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
- **Rastreador MegaSat/STC**: **FUNCIONANDO EM MODO LIVE** (2026-07-14). A doc oficial
  (`ap2.stc.srv.br/docs/`) nunca respondeu — em vez disso, capturei a auth real via
  engenharia reversa da SPA em `ap3.stc.srv.br/webcliente/megasatrastreamento/` (DevTools):
  `POST /integration/prod/sys/api/user/login` com JSON `{key,user,pass}` devolve um JWT;
  `POST /integration/prod/sys/grid/loadGridTracker` (com o token no header `Authorization`
  e reaproveitando o `variables` devolvido no login, senão quebra com "Undefined index")
  devolve as posições. `RastreadorService.buscarPosicoesNovas()` agora combina Assemilsat +
  MegaSat (frotas parcialmente sobrepostas), dedup por placa pela posição mais recente.
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
- AAW → AAW-8J03 ✅ (via MegaSat, 2026-07-14)
- IQU → IQU-3C12 ✅ (via MegaSat, 2026-07-14)
- RLI → **ainda pendente** — não apareceu nos 3 veículos retornados pelo MegaSat (só AAW, IQU
  e um veículo "MJZ0693" sem label, aparentemente de outra frota do mesmo cliente STC). Tentar
  via `listarVeiculos` do Assemilsat, ou confirmar com o cliente se RLI tem device MegaSat.

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
  agrupada por classe (campo `tipo` de `HoraExtra`) e por motorista. **Direção contínua (5h30 +
  pausa 30min, CTB art. 67-C) e intrajornada (1h refeição, CLT 235-C §2º) confirmadas
  implementadas (2026-07-17)** — essa nota dizia "ainda não verificável", estava desatualizada.
  `LeiMotoristaService.analisarTelemetriaViagem()` percorre `TelemetriaPosicao` (persistida a
  cada 5 min pelo cron do rastreador, só pra viagens em andamento) ponto a ponto, com lógica de
  gap de sinal (>2h reseta contadores) e pausa acumulada (soma deltas parados, não delta único)
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
- **API em produção (2026-07-17, confirmado ao vivo)**: ao contrário do que estava registrado
  aqui antes, a API NestJS **está** respondendo em produção em `molinett-api.vercel.app`
  (retornando 200 em `/frota/painel`, `/financeiro/painel` etc. — confirmado via login real
  contra `molinett.vercel.app/login`). Ou seja, o site em produção já loga e carrega dados
  reais hoje; a nota antiga dizendo que "NestJS não roda na Vercel, próximo passo é Railway"
  estava desatualizada — não decidi migrar pra Railway sozinho, só corrigi o registro pra
  bater com o estado real observado.

### Não iniciado / pendente
- **Supabase Auth**: cliente confirmou que quer "supabase auth normal" pro plano multi-domínio
  (molinett.frotaai.com / franco.frotaai.com). Migração JWT→Supabase Auth planejada, ainda
  não iniciada — é refactor grande (auth module, guards, frontend, seeds).
- **OCR de hodômetro/cupom + SEFAZ (2026-07-14)**: parcialmente resolvido.
  - **Decodificador de chave/QR Code da NFC-e** (`packages/api/src/ocr/nfce-chave.util.ts`):
    funcionando de verdade, sem credencial nenhuma — extrai CNPJ do emitente, UF e data de
    emissão direto dos 44 dígitos da chave (testado com chave sintética, dígito verificador
    módulo 11 confere). Esse é o caminho fiscalmente correto recomendado pelos docs (evita OCR).
  - **Limite confirmado**: a consulta pública da SEFAZ-SC (`sat.sef.sc.gov.br/nfce/consulta`)
    tem proteção anti-bot (captcha) — não dá pra buscar valor/itens da nota programaticamente
    sem o certificado e-CNPJ (webservice oficial `NFeDistribuicaoDFe`), que ainda não temos.
  - **OCR (hodômetro/cupom)**: módulo `packages/api/src/ocr/` criado com `OCR_MODE=mock|live`
    (mesmo padrão do rastreador). Em mock (padrão hoje), sempre retorna
    `precisaConfirmacaoHumana: true` sem inventar dado — não há chave de visão configurada
    ainda. **Atualizado 2026-07-14**: `OCR_MODE=live` ativado de verdade, `LLM_PROVIDER=gemini`
    (pedido do cliente — "Gemini Flash"), `GEMINI_API_KEY` real configurada, modelo
    `gemini-2.5-flash`. Testado ponta a ponta com imagem sintética (número desenhado lido
    corretamente, confiança 0.99) — a integração funciona de verdade, não é mock. Adapter mantém
    `chamarAnthropic()` como provedor alternativo (`LLM_PROVIDER=anthropic`) sem mudar código.
    Endpoints: `POST /ocr/hodometro`, `POST /ocr/cupom`, `POST /ocr/qrcode-cupom` (esse último
    já é live). Tela `/diesel` tem campo pra colar o QR Code e conferir CNPJ/data na hora.
  - **Falta**: confirmar o ID exato do modelo Gemini "Flash" vigente com o cliente/docs (usado
    `gemini-2.5-flash`, funcionando, mas nomenclatura Gemini muda); e o certificado e-CNPJ se
    quiserem consulta automática de valor via NFeDistribuicaoDFe.
- **Conflito a resolver com o cliente**: o Escopo v3/critérios de aceite exigem WhatsApp
  **oficial da Meta** (guardrail: "nada de WhatsApp não-oficial"), mas a decisão registrada
  foi Evolution API. Re-confirmar antes do go-live — critério de aceite cita Cloud API.
- Senha do seed do admin não fica mais hardcoded em `prisma/seed.ts` — lê de
  `SEED_ADMIN_PASSWORD` no `.env` (nunca commitado). Isso destravou o `git push` (estava
  bloqueado antes por causa da senha real de produção entrando no histórico do git).
  Trocar a senha do admin em produção no primeiro login continua pendente.
- **[A VALIDAR COM A CONTABILIDADE] CT-e vs NFS-e (2026-07-15)**: `pesquisa_juridico_fiscal_junho2026.md`
  §2 (pesquisa em fonte oficial, SEFAZ-MT) conclui que reboque/guincho é **transporte de carga
  → CT-e modelo 57**, não NFS-e/ISS. O sistema hoje assume NFS-e (`NFSE_URL`/`NFSE_CNPJ` no
  `.env`, `ParametroTributario.iss = 2%` no seed). **Não decidi trocar sozinho** — é decisão real
  de emissão fiscal, com consequência regulatória. O que já fiz: `nfce-chave.util.ts` decodifica
  chave de CT-e (mod 57) igual à de NFC-e (o layout de 44 dígitos é o mesmo pra todo DF-e); nova
  env var `FISCAL_DOC_TYPE` (default `"nfse"`, preparada pra virar `"cte"` quando confirmado).
  Nota: `ParametroTributario.iss` **não é consumido em nenhum cálculo hoje** (só cadastro morto,
  igual o `AuditLog` estava antes de ser plugado) — ou seja, não tem imposto sendo cobrado errado
  em produção agora, é só a integração NFS-e que pode estar apontando pro documento fiscal errado.
- **Veículos de teste desativados (2026-07-15)**: `AAC` e `OPG` (`ativo=false`) — confirmado com
  o cliente que eram só teste. Ficaram com histórico real vinculado (AAC: 17 cotações, 6 viagens,
  1 abastecimento, 1 OS de manutenção) — não apaguei os registros, só desativei o veículo (some
  das telas normais, mas o histórico não se perde). Se quiser limpar esse histórico de teste
  também, avisar explicitamente antes — é dado com FK, apagar em cascata é irreversível.

## Decisões em aberto (não decidir sozinho, perguntar)

1. **Autenticação**: alguém (apelidado "Marco"/"G Linkedin" nas conversas) mencionou querer
   "Supabase Auth normal" para um plano de deploy multi-domínio (`molinett.frotaai.com`,
   `franco.frotaai.com`). Ficou definido que JWT próprio não impede deploy no Vercel — a
   pergunta que falta responder é *por que* ele quer Supabase Auth especificamente (SSO entre
   domínios? magic link?). Não migrar sem confirmar o motivo real.

2. ~~**JWT_SECRET**~~ — **resolvido em 2026-07-17**. O `.env` já tinha um valor aleatório real
   (essa nota estava desatualizada — não era mais o placeholder óbvio). Rotacionado mesmo assim
   por precaução (valor antigo passou por mais mãos), sincronizado com a Vercel (`molinett-api`,
   ambientes Production e Preview) e a API foi redeployada. Login verificado ao vivo depois da
   rotação.

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