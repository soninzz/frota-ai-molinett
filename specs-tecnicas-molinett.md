# Specs Técnicas & Setup — Frota AI · Transportes Molinett

> Documento 3 de 4 · escrito para que o **Claude Code provisione a plataforma de forma autônoma** na sessão de implementação. Hospedagem = *a mais simples que atende*. Tudo o que depende de decisão da Molinett está marcado **`[A VALIDAR]`**.
> O Escopo v3 define: arquitetura cloud, **provedor a definir pela contratada com aprovação da Molinett**, recorrência cobrindo hospedagem, BD, backups diários, monitoramento, suporte, WhatsApp API e integrações.

---

## 1. Princípio de hospedagem

Para uma operação de 5 veículos, com **WhatsApp (webhook público HTTPS)**, **ingestão de rastreador** (possivelmente por stream TCP via Traccar), jobs/cron e BD relacional, a opção mais simples que atende é:

> **Um único servidor (VM) com Docker Compose**, banco **PostgreSQL gerenciado**, **Redis** para fila/cache e **object storage S3-compatível** para fotos — em **região do Brasil** (conforto LGPD e latência).

Evita a complexidade de Kubernetes e a limitação de PaaS sem portas TCP arbitrárias (necessárias se o rastreador exigir Traccar recebendo o stream do aparelho). É barato, previsível e cabe na recorrência.

### 1.1 Stack recomendada (pluggável)
| Camada | Escolha recomendada | Por quê |
|---|---|---|
| Linguagem/back | **Node.js + TypeScript** (NestJS) | Um só idioma p/ API, bot e workers; SDKs maduros (Meta, Google, OCR) |
| Front | **Next.js (React)** responsivo | Web única p/ desktop/tablet/celular; SSR p/ painéis |
| Banco | **PostgreSQL 16** (gerenciado) + Prisma | Dados financeiros/frota relacionais; **versionamento/auditoria** por triggers/tabela de versões |
| Fila/cron | **Redis + BullMQ** | Webhooks assíncronos, OCR, motor de alertas, jobs diários (resumos, projeções, parcelas) |
| Cache | **Redis** (mesma instância) | Metas dinâmicas, custo/km vivo |
| Storage | **S3-compatível** (R2/S3) | Fotos de painel/cupom/pneu, notas de oficina |
| Rastreador | **Traccar** (container) | Normalizador 200+ protocolos (se stream do aparelho) |
| Proxy/TLS | **Caddy** (TLS automático Let's Encrypt) | HTTPS p/ webhook do WhatsApp sem trabalho manual |
| IA | **Gemini** via adaptador | Visão (hodômetro/cupom) + voz PT-BR + NLU num só endpoint |

> Provedor de referência: **AWS região `sa-east-1` (São Paulo)** — Lightsail/EC2 + RDS + S3 + Route 53. Alternativas de menor custo: **Hetzner Cloud** ou **DigitalOcean** (+ Cloudflare DNS). **Escolha final precisa de aprovação da Molinett** (Escopo v3 §12). `[A VALIDAR]`

### 1.2 Topologia

```mermaid
flowchart TB
  subgraph Internet
    META["Meta WhatsApp Cloud API"]
    RASTAPI["Webservice rastreador\n(Log Soluções) / dispositivos TCP"]
    GEM["Gemini / OCR / SEFAZ / BCB"]
    USERS["Equipe (web + WhatsApp)"]
  end
  subgraph VM["VM única · Docker Compose · região BR"]
    CADDY["Caddy (TLS 443)\nreverse proxy"]
    APP["API + Web (Next/Nest)"]
    WORKER["Workers BullMQ\n(alertas, OCR, jobs, cron)"]
    TRACCAR["Traccar (opcional)\nTCP por protocolo"]
    REDIS[("Redis\nfila + cache")]
  end
  DBM[("PostgreSQL gerenciado\n+ backups diários")]
  S3[("Object Storage S3")]

  USERS --> CADDY --> APP
  META -- webhook --> CADDY
  APP <--> REDIS <--> WORKER
  APP --- DBM
  WORKER --- DBM
  APP --- S3
  RASTAPI --> WORKER
  RASTAPI -. stream .-> TRACCAR --> WORKER
  WORKER --> GEM
  APP --> META
```

---

## 2. Domínio, DNS, TLS e deploy

Pré-requisito do WhatsApp: **webhook em HTTPS válido**. Passos (provedor de referência AWS; equivalentes em Hetzner/DO+Cloudflare entre colchetes):

1. **Domínio.** Usar subdomínio da Molinett (ex.: `app.frota.molinett.com.br`) ou registrar `.com.br` em [Registro.br](https://registro.br/). `[A VALIDAR]` domínio.
2. **DNS.** Criar zona e apontar `A`/`AAAA` para o IP estático da VM. AWS: [Route 53 — criar registros](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html). [Cloudflare: [Manage DNS records](https://developers.cloudflare.com/dns/manage-dns-records/)].
3. **IP estático.** AWS Lightsail: [Static IP](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html) / EC2 Elastic IP.
4. **Portas/firewall.** Abrir 80/443 (web/webhook) e, se Traccar receber stream, as **portas TCP por protocolo** (ex.: 5004 Queclink). AWS: [Lightsail firewall](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html).
5. **TLS.** Caddy obtém/renova certificado Let's Encrypt automaticamente ([Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)). [Alternativa: ACM/Cloudflare].
6. **Deploy.** `docker compose up -d` na VM (instalar Docker: [docs.docker.com/engine/install](https://docs.docker.com/engine/install/)). CI opcional: GitHub Actions → SSH/registry.
7. **Banco gerenciado + backups diários.** AWS RDS PostgreSQL ([Backups automáticos](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)). [Alternativa: Postgres em container com `pg_dump` agendado p/ S3].
8. **Object storage.** Criar bucket privado (S3 [Creating a bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html) / R2).

---

## 3. `.env` completo (agrupado por serviço)

```dotenv
# ───────────────────────── APP / CORE ─────────────────────────
NODE_ENV=production
APP_BASE_URL=https://app.frota.molinett.com.br
TZ=America/Sao_Paulo
JWT_SECRET=                      # CRIAR (gerar aleatório) — auth da web
SESSION_SECRET=                  # CRIAR
LOG_LEVEL=info

# ─────────── INTERRUPTORES DE SEGURANÇA (ver §6) ───────────
DRY_RUN=true                     # true = NÃO dispara efeitos externos reais
WHATSAPP_MODE=mock               # mock | live
TRACKER_MODE=mock                # mock | live
OCR_MODE=mock                    # mock | live
SEFAZ_MODE=mock                  # mock | live
BANK_MODE=mock                   # mock | live (mantém mock no MVP)

# ───────────────────────── DATABASE ─────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/frota_ai   # PEDIR/CRIAR
REDIS_URL=redis://localhost:6379

# ───────────────────────── OBJECT STORAGE ───────────────────
S3_ENDPOINT=                     # CRIAR (S3/R2)
S3_REGION=sa-east-1
S3_BUCKET=frota-ai-midias
S3_ACCESS_KEY_ID=                # CRIAR
S3_SECRET_ACCESS_KEY=            # CRIAR

# ───────────────────────── WHATSAPP (Meta) ──────────────────
WA_GRAPH_VERSION=v25.0
WA_BASE_URL=https://graph.facebook.com
WA_PHONE_NUMBER_ID=              # PEDIR (Meta Business da Molinett)
WA_WABA_ID=                      # PEDIR
WA_SYSTEM_USER_TOKEN=            # PEDIR (token permanente)
WA_APP_ID=                       # PEDIR
WA_APP_SECRET=                   # PEDIR (valida X-Hub-Signature-256)
WA_WEBHOOK_VERIFY_TOKEN=         # CRIAR (string aleatória do handshake)
WA_DEFAULT_LANG=pt_BR

# ───────────────────────── IA / GEMINI ──────────────────────
GEMINI_API_KEY=                  # CRIAR (Google AI Studio) ou usar Vertex SA
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MODEL_REASONING=gemini-2.5-pro   # [A VALIDAR] id de preview vigente
# Alternativos (adaptador de provedor):
ANTHROPIC_API_KEY=               # opcional (NLU/raciocínio) — claude-opus-4-8
OPENAI_API_KEY=                  # opcional (whisper / gpt-*)
LLM_PROVIDER=gemini              # gemini | anthropic | openai

# ───────────────────────── OCR FALLBACK ─────────────────────
OCR_FALLBACK=textract            # textract | azure | gemini
AWS_ACCESS_KEY_ID=               # CRIAR (se Textract; ⚠️ sem região SP)
AWS_SECRET_ACCESS_KEY=
AZURE_DI_ENDPOINT=               # CRIAR (se Azure — Brazil South)
AZURE_DI_KEY=

# ───────────────────────── RASTREADOR ───────────────────────
TRACKER_PROVIDER=logsolucoes     # logsolucoes | segmov | traccar  [A VALIDAR]
TRACKER_API_BASE=                # PEDIR (webservice Log Soluções)
TRACKER_API_USER=                # PEDIR
TRACKER_API_TOKEN=               # PEDIR
TRACCAR_URL=http://traccar:8082  # se stream de dispositivo
TRACCAR_TOKEN=                   # CRIAR (se Traccar)

# ───────────────────────── FISCAL / SEFAZ ───────────────────
SEFAZ_UF=SC
NFE_CERT_PFX_PATH=/secrets/ecnpj.pfx   # PEDIR (e-CNPJ A1 ICP-Brasil)
NFE_CERT_PASSWORD=                     # PEDIR
FISCAL_DOC_TYPE=                       # [A VALIDAR] cte | nfse

# ───────────────────────── MERCADO (dados abertos) ──────────
BCB_SGS_BASE=https://api.bcb.gov.br/dados/serie
TESOURO_CSV_URL=https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto

# ───────────────────────── CARTÃO COMBUSTÍVEL (opcional) ─────
INTER_CLIENT_ID=                 # PEDIR (se usar)
INTER_CLIENT_SECRET=             # PEDIR
INTER_CERT_PATH=                 # PEDIR (mTLS)

# ───────────────────────── ALERTAS / PARÂMETROS PADRÃO ──────
ALERT_REVISAO_KM=1000
ALERT_DOC_DIAS=15
META_MARGEM_SEGURANCA_PCT=10
CONSUMO_QUEDA_ALERTA_PCT=15
FALHAS_SETOR_LIMIAR=5
FALHAS_SETOR_JANELA_DIAS=90
TOX_CNH_ALERTA_DIAS=60,30
```

> **Regra de ouro:** segredos **nunca** no front, nunca no repositório. Em produção, usar **gerenciador de segredos** (AWS Secrets Manager / arquivo `/secrets` montado, fora do git). O `.env` acima é o contrato de variáveis; valores reais entram só no servidor.

---

## 4. Endpoints externos por serviço

| Serviço | Base URL | Auth | Doc |
|---|---|---|---|
| WhatsApp Cloud API | `https://graph.facebook.com/v25.0` | Bearer (System User Token) | [developers.facebook.com/docs/whatsapp/cloud-api](https://developers.facebook.com/docs/whatsapp/cloud-api/) |
| Gemini (Google AI) | `https://generativelanguage.googleapis.com/v1beta` | API key | [ai.google.dev](https://ai.google.dev/gemini-api/docs) |
| Anthropic (opcional) | `https://api.anthropic.com/v1` | `x-api-key` | [docs.anthropic.com](https://docs.anthropic.com/) |
| OpenAI (opcional) | `https://api.openai.com/v1` | Bearer | [platform.openai.com](https://platform.openai.com/docs) |
| AWS Textract | `https://textract.{region}.amazonaws.com` | SigV4 | [aws.amazon.com/textract](https://aws.amazon.com/textract/) |
| Azure Document Intelligence | `https://{rec}.cognitiveservices.azure.com` | API key/Entra | [learn.microsoft.com](https://learn.microsoft.com/azure/ai-services/document-intelligence/) |
| Rastreador (Log Soluções) | `[A VALIDAR]` | token/cert | contato@logsolucoes.com |
| Traccar (self-host) | `http://traccar:8082/api` | Bearer/Basic | [traccar.org/api-reference](https://www.traccar.org/api-reference/) |
| SEFAZ NF-e Distribuição | webservice por UF | e-CNPJ A1 | [nfe.fazenda.gov.br](https://www.nfe.fazenda.gov.br/) |
| BCB SGS | `https://api.bcb.gov.br/dados/serie` | nenhuma | [dadosabertos.bcb.gov.br](https://dadosabertos.bcb.gov.br/) |
| Tesouro Transparente | CSV | nenhuma | [tesourotransparente.gov.br](https://www.tesourotransparente.gov.br/) |
| Banco Inter (opcional) | `https://cdpj.partners.bancointer.com.br` `[A VALIDAR]` | OAuth + mTLS | [developers.inter.co](https://developers.inter.co/) |

---

## 5. Checklist de credenciais — PEDIR × CRIAR

### 5.1 O Claude Code deve **PEDIR** ao responsável (só ele tem)
- [ ] **Meta WhatsApp:** acesso ao Business Manager da Molinett OU o conjunto: System User Token, Phone Number ID, WABA ID, App ID, App Secret. **Nº dedicado** + **opt-in** dos contatos.
- [ ] **Rastreador:** confirmação do provedor (Assemilsat/Log Soluções ou SegMov), endpoint + credenciais do webservice **ou** autorização para reprovisionar o APN dos aparelhos (Traccar). **(G0 bloqueante)**
- [ ] **Certificado e-CNPJ A1** (ICP-Brasil) + senha — para SEFAZ. (Contabilidade da Molinett.)
- [ ] **Documento fiscal** emitido (CT-e ou NFS-e) e como obter o XML. `[A VALIDAR]`
- [ ] **Cartão combustível** (se Inter): client_id/secret + certificado. (opcional)
- [ ] **Domínio/subdomínio** a usar + acesso ao DNS. `[A VALIDAR]`
- [ ] **Dados históricos** das 9 planilhas para importação.
- [ ] **Aprovação do provedor de hospedagem** e da conta cloud a usar.
- [ ] **Pontos focais** por área (operacional, manutenção, financeiro, comercial).

### 5.2 O Claude Code **CRIA/CONFIGURA** (não exige terceiros)
- [ ] Conta/projeto **Google Cloud** + **GEMINI_API_KEY** (ou Service Account Vertex).
- [ ] Conta **AWS/Azure** para OCR fallback (se usado).
- [ ] **App OAuth/segredos internos** (JWT_SECRET, SESSION_SECRET, WA_WEBHOOK_VERIFY_TOKEN) — gerados.
- [ ] **Infra:** VM, PostgreSQL gerenciado, Redis, bucket S3, IP estático, firewall, TLS (Caddy).
- [ ] **Traccar** (container) se stream de dispositivo.
- [ ] **Templates de mensagem** do WhatsApp (submeter p/ aprovação).
- [ ] **Schema/migrations**, seeds de catálogos (§Doc 1 §6), jobs/cron.

---

## 6. Ordem de bootstrap autônomo

```mermaid
flowchart LR
  A["1. Validar credenciais\n(GET seguros / ping)"] --> B["2. Schema + migrations\n+ seeds de catálogos"]
  B --> C["3. Clients c/ adapters\n(WA, IA, OCR, rastreador, SEFAZ)"]
  C --> D["4. Webhook handler\n+ validação de assinatura"]
  D --> E["5. Jobs/cron\n(alertas, resumos, projeções, parcelas)"]
  E --> F["6. Deploy na VM\n(Docker Compose + Caddy/TLS)"]
  F --> G["7. Registrar webhook\nna Meta + assinar 'messages'"]
  G --> H["8. Domínio/DNS\napontado e propagado"]
  H --> I["9. Testes ponta a ponta\n(mock → recurso isolado)"]
```

1. **Validar credenciais** com chamadas **somente-leitura** (ex.: `GET /v25.0/{phone-number-id}` no WhatsApp; `GET` de saldo/série no BCB; ping no webservice do rastreador). Falha → parar e reportar.
2. **Schema/migrations** (Prisma) + **seeds**: veículos (MLC/AAW/MHG/IFF/IQU/RLI), perfis RBAC, plano de contas/CC, clientes+prazos (aba DATAS), itens de revisão, parâmetros (§Doc 1 §6).
3. **Clients com adaptadores** por integração (interface estável + implementação por provedor) — permite trocar rastreador/LLM sem reescrever.
4. **Webhook** do WhatsApp: handshake `hub.challenge` + validação `X-Hub-Signature-256`; enfileira no Redis (responder 200 rápido).
5. **Jobs/cron** (BullMQ): resumos diários por perfil (07h/07h30/08h), aviso de vencimento (1 dia antes), recálculo de metas (diário), geração de parcelas, projeção de caixa, polling do rastreador (se sem webhook), reagendamento de recebíveis atrasados.
6. **Deploy** `docker compose up -d` + Caddy (TLS).
7. **Registrar webhook** na Meta e **assinar o campo `messages`**.
8. **Domínio/DNS** apontado; validar propagação e HTTPS.
9. **Testes E2E** em **mock**, depois em **recurso isolado** (§7).

---

## 7. Estratégia de testes sem impactar produção

Adaptada ao que cada integração permite (sempre consultando a doc da integração).

### 7.1 Interruptores (definidos no `.env`)
- **`DRY_RUN=true`** — global: monta e valida payloads, **não dispara** efeitos externos reais (não envia WhatsApp, não cria lançamento, não confirma OS no rastreador).
- **`{SERVICO}_MODE=mock|live`** por integração que altera estado (`WHATSAPP_MODE`, `TRACKER_MODE`, `OCR_MODE`, `SEFAZ_MODE`, `BANK_MODE`).

### 7.2 Modo mock
- Monta o payload e **valida contra o schema documentado**, **sem executar a escrita**; **persiste** o payload para inspeção (tabela `outbox_mock` / arquivo).
- **Leituras (GET) são seguras** — usar para validar auth e parsing (WhatsApp `GET /{id}`, BCB SGS, consulta SEFAZ de NFC-e por chave, Traccar `GET /devices`).

### 7.3 Teste live só em recurso isolado
- **WhatsApp:** número/WABA **de teste** e contatos da própria equipe (com opt-in); validar **handshake do webhook** antes de ativar. Nunca disparar para clientes reais em teste.
- **Rastreador:** instância/aparelho de teste; nunca dados reais de produção. Confirmar se há **sandbox/homologação** — Log Soluções/SegMov **provavelmente não oferecem** → usar **mock + 1 aparelho isolado**. `[A VALIDAR]`
- **SEFAZ:** usar **ambiente de homologação** da SEFAZ/SC para emissão/consulta; produção só após aceite.
- **Bancos:** manter **`BANK_MODE=mock`** no MVP (integração viva é futura).
- **Financeiro interno:** lançamentos de teste em **empresa/competência sandbox**, desfeitos após o teste.

### 7.4 Promoção a produção
Só após os **gates do [Doc 4](criterios-de-sucesso-molinett.md)** e **aprovação humana explícita**. Sequência: dev/mock → teste controlado (recurso isolado) → go-live faseado por módulo → operação plena.

---

## 8. Observabilidade, backup e segurança (mínimos)
- **Logs estruturados** + correlação por evento; **trilha de auditoria** em BD (não confundir com logs).
- **Backups diários** do Postgres (retenção ≥ 7 dias) + teste de restore.
- **Monitoramento**: uptime do webhook, fila BullMQ, latência de IA, qualidade do número WhatsApp (GREEN/YELLOW/RED).
- **Segredos** em secrets manager; rotação do System User Token quando aplicável.
- **Dados em região BR** (conforto LGPD) `[A VALIDAR]`; criptografia em repouso e trânsito.

---

*Grupo Diga · Frota AI — Specs Técnicas & Setup · Transportes Molinett · v1.0 · 2026-06-15*
