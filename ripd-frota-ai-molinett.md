# RIPD — Relatório de Impacto à Proteção de Dados Pessoais

> Frota AI · Transportes Molinett · Rascunho técnico (LGPD art. 38 — recomendado para
> tratamento de dado sensível e monitoramento). **Não é o documento final** — precisa de
> validação jurídica e preenchimento dos campos `[A VALIDAR]` pela Molinett antes de virar
> RIPD oficial.

## 1. Identificação

- **Controlador:** Transportes Molinett
- **Encarregado (DPO):** `[A VALIDAR]` — ver `DPO_NOME`/`DPO_EMAIL` no `.env`, exposto em `GET /lgpd/politica`
- **Operador (fornecedor de tecnologia):** Grupo Diga / Frota AI

## 2. Atividades de tratamento com risco elevado

### 2.1 Geolocalização (GPS) de motoristas em tempo real

- **Dado tratado:** latitude/longitude, velocidade, ignição, timestamp — via rastreadores Assemilsat e MegaSat/STC
- **Finalidade:** apuração de horas trabalhadas (HT/HP), conformidade com a Lei do Motorista, análise de rota/produtividade
- **Base legal:** legítimo interesse do controlador (LGPD art. 7º, IX)
- **Teste de balanceamento (LIA):**
  - *Necessidade:* sem posição, não há como apurar HT/HP nem cumprir a Lei 13.103/2015 de forma auditável
  - *Finalidade legítima:* obrigação trabalhista (apuração de jornada) + segurança operacional
  - *Proporcionalidade:* rastreamento limitado ao veículo da empresa, durante jornada de trabalho — `[A VALIDAR]` se o rastreador é desligado fora de jornada (depende do hardware, fora do controle do software)
  - *Expectativa do titular:* motorista de frota comercial tem expectativa reduzida de privacidade quanto à localização do veículo da empresa durante o trabalho — `[A VALIDAR]` comunicar isso formalmente no contrato/aditivo de trabalho
- **Retenção:** posição bruta (`TelemetriaPosicao`) hoje sem política de expurgo automático — **gap**, recomendado definir prazo (ex: 12 meses) e implementar rotina de limpeza
- **Compartilhamento:** não há hoje. Dado fica só no banco Supabase (Frota AI)

### 2.2 Dados de motorista (CPF, CNH, exames)

- **Dado tratado:** CPF, número da CNH, categoria, vencimento, vencimento do exame toxicológico, MOPP, NR-20
- **Finalidade:** cumprir obrigação legal (CTB, Lei do Motorista) de verificar habilitação e aptidão antes de alocar viagem
- **Base legal:** cumprimento de obrigação legal/regulatória (LGPD art. 7º, II) + execução de contrato de trabalho (art. 7º, V)
- **Retenção:** durante o vínculo empregatício + prazo de guarda trabalhista (`[A VALIDAR]` prazo exato com contabilidade/jurídico)

### 2.3 Voz (transcrição de comandos por WhatsApp) — **ainda não implementado**

- Sinalizado no escopo como funcionalidade futura (comandos por áudio)
- **Dado sensível** (LGPD art. 5º, II — dado biométrico se usar reconhecimento de voz para autenticação; se for só transcrição de conteúdo falado, não é biometria, mas o áudio em si pode conter outros dados sensíveis incidentalmente)
- **Base legal exigida:** consentimento específico e destacado (art. 11, I) — **não implementar sem esse consentimento explícito capturado antes do primeiro uso**
- **Recomendação:** quando for construir, pedir opt-in explícito por mensagem antes de processar o primeiro áudio de cada usuário, registrar o consentimento com timestamp

## 3. Direitos do titular — implementação atual

| Direito | Status | Onde |
|---|---|---|
| Acesso (art. 18, I) | ✅ Implementado | `GET /auth/me/dados` |
| Correção (art. 18, III) | ✅ Implementado (campos autodeclarados) | `PATCH /auth/me/dados` |
| Eliminação (art. 18, VI) | ✅ Implementado (anonimização, respeita retenção legal) | `DELETE /auth/me/dados` |
| Portabilidade (art. 18, V) | 🟡 Parcial — export é JSON estruturado, mas não segue um schema padrão de portabilidade entre sistemas | `GET /auth/me/dados` |
| Informação sobre compartilhamento (art. 18, VII) | ✅ Implementado | `GET /lgpd/politica` |
| Revogação de consentimento (art. 18, IX) | ⚪ N/A hoje — nenhum tratamento atual depende de consentimento (todos são obrigação legal/legítimo interesse); vira necessário se/quando a transcrição de voz (§2.3) for implementada |

## 4. Incidente de segurança

- **Prazo de notificação:** 3 dias úteis à ANPD e aos titulares afetados (Res. CD/ANPD 15/2024)
- **Processo hoje:** `[A VALIDAR]` — não existe um runbook formal de resposta a incidente. Recomendado documentar: quem decide se um evento é "incidente reportável", canal de notificação à ANPD, template de comunicação aos titulares

## 5. Gaps conhecidos (pendências reais, não é "tudo resolvido")

1. Sem expurgo automático de `TelemetriaPosicao` (GPS bruto acumula indefinidamente)
2. Sem runbook de resposta a incidente
3. Encarregado (DPO) ainda não nomeado pela Molinett
4. Sem termo de consentimento formal assinado pelos motoristas sobre rastreamento GPS (LIA existe aqui como rascunho técnico, mas comunicação formal ao titular ainda não foi feita)
5. Backups do Supabase — política de retenção/expurgo não auditada neste documento

---

*Rascunho técnico gerado em 2026-07-15 — Grupo Diga / Frota AI. Precisa de revisão jurídica antes de virar RIPD oficial da Molinett.*
