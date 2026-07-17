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
  pixel-sampling do logo real, o azul `#1E4C8C` documentado aqui antes era um placeholder
  incorreto), vermelho `#C0392B` para estados de alerta/erro.

## Status atual (real, não otimista)

### Completo e testado
- Todas as 16+ telas do núcleo (cotação, frota, jornada, financeiro, cadastros, aprovação de
  margem negativa, pneus, alertas)
- Fluxo de negócio completo testado: cotação → OS → viagem → comissão → financeiro
- Motor de alertas interno (grava no banco, aparece em `/alertas` — ainda não envia WhatsApp)
- Autenticação JWT funcionando (login, RBAC por perfil)

### Em andamento / bloqueado
- **Rastreador Assemilsat**: autenticação confirmada (form-data com `usuario`/`senha`,
  ver `/mnt/skills` ou arquivos `rastreador-assemilsat-adapter.ts` gerados anteriormente).
  Endpoints reais confirmados: `/ultimaPosicao`, `/posicoes`, `/posicoesData`, `/distanciaVeiculo`,
  `/jornadaTrabalhoRelatorioAtividade`, `/listarVeiculos`. **TRACKER_MODE ainda em "mock"**.
- **Rastreador MegaSat/STC**: autenticação confirmada (MD5, chave de integração), mas a
  documentação de endpoints (`ap2.stc.srv.br/docs/`) está dando 404 — aguardando suporte STC.
- **WhatsApp via Evolution API** (não é a API oficial da Meta — decisão do cliente, registrada
  e aceita apesar do risco de banimento). Instância `Diga3` criada, mas travada: WhatsApp recusa
  conectar novo dispositivo ("não é possível conectar no momento") — provável versão desatualizada
  do Baileys no servidor Evolution, depende de quem administra o servidor (easypanel.host).

### Pendência de dado — placas dos veículos
O banco tem 6 veículos com placa cadastrada como CÓDIGO CURTO (`MHG`, `IFF`, `MLC`, `AAW`, `IQU`,
`RLI`) em vez da placa real completa. O Assemilsat retorna placas completas (ex: `MHG-1A49`).
**Decisão tomada**: trocar a placa no banco pro formato completo (mais simples que criar vínculo
por ID externo). Já confirmado:
- MHG → MHG-1A49
- IFF → IFF-3I63
- MLC → MLC-1A51
- AAW, IQU, RLI → **ainda não confirmado**, pegar via endpoint `listarVeiculos` do Assemilsat

### Não iniciado
- Módulo de sinistros/seguradoras (credenciais recebidas: Mondial, Tokio, Veniti, Porto Seguro,
  Notro, USS, Fácil Assist, Webprestador, Mawdy — nenhum código ainda)
- OCR de hodômetro/cupom fiscal (confirmado que vamos fazer — falta decidir/obter chaves de
  Google Vision e Claude API)
- SEFAZ (certificado digital ainda não confirmado qual arquivo/senha usar)
- Scheduler/cron (nenhum job automático roda no sistema hoje — tudo é request-response)
- Simulador financeiro, comparador de cenários (S05)
- Lei do Motorista, relatório de hora extra por classe (S04)
- Deploy (Vercel + Railway) — propositalmente deixado por último

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