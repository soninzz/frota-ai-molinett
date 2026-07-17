# Normas brasileiras — Gestão de jornada e frota (reboque/guincho/plataforma) — Estado atual jun/2026

> Foco: números acionáveis para alertas e bloqueios de software. Fontes oficiais. Mudanças 2023–2026 sinalizadas. Incertezas marcadas com ⚠️.
>
> **ALERTA CENTRAL:** O **STF (ADI 5322, julgada em 30/06/2023)** declarou inconstitucionais 11 pontos da Lei 13.103/2015. Vários números ainda constam no texto consolidado, mas **não valem mais**. Marcados abaixo como **[STF: REVOGADO]**. Não codifique os dispositivos derrubados como válidos. Fonte: [STF — notícia ADI 5322](https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=510120) · [TST](https://www.tst.jus.br/en/-/stf-invalida-dispositivos-da-lei-dos-caminhoneiros-sobre-tempo-de-espera-jornada-e-descanso) · [acórdão (PDF jus.br)](https://portal.trt3.jus.br/internet/jurisprudencia/repercussao-geral-e-controle-concentrado-adi-adc-e-adpf-stf/downloads/adi-5322-acordao.pdf)

## 1. Lei do Motorista (Lei 13.103/2015) + CLT/CTB

| Regra | Limite ACIONÁVEL (válido jun/2026) | Base |
|---|---|---|
| **Direção contínua (carga)** | Máx. **5h30 ininterruptas** de direção; **30 min de descanso a cada 6h**. Passageiros: 30 min a cada 4h. | CTB **art. 67-C** (inalterado) |
| **Jornada diária** | **8h** normais **+ 2h extras** (ou **+ 4h** com acordo/convenção coletiva) | CLT **art. 235-C** caput |
| **Intervalo intrajornada** | **1h** mínimo para refeição, **separado** | CLT 235-C §2º; **[STF: REVOGADO]** a coincidência com a parada de direção |
| **Interjornada** | **11h contínuas, NÃO fracionáveis** | CLT 235-C §3º; **[STF: REVOGADO]** o fracionamento das 11h |
| **Descanso semanal** | **35h** (24h + 11h), gozadas **semanalmente, sem acúmulo/diferimento** | CLT 235-D; **[STF: REVOGADO]** §§1º/2º/5º (fracionamento e acúmulo até retorno à base) |
| **Tempo de espera** | **CONTA como jornada** (tempo à disposição). Remunerado como hora normal; se exceder, hora extra ≥50% | CLT 235-C §§8º/9º; **[STF: REVOGADO]** a regra antiga de "não conta + 30%" |
| **Revezamento 2 motoristas** | Descanso **só com veículo PARADO**. Descanso com veículo **em movimento é proibido** | CLT 235-D §5º / 235-E III; **[STF: REVOGADO]** |

Texto consolidado: [CLT (Planalto)](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm) · [CTB (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm)

**Regras de software (bloqueio ao alocar OS):**
- Bloquear OS se direção projetada > **5h30** sem inserir parada de 30 min.
- Bloquear se jornada projetada > **8h** (alerta) / > limite com HE (bloqueio conforme CCT).
- Exigir **11h livres** entre fim de uma jornada e início da próxima (contínuas).
- Garantir **35h** de folga semanal acumuladas dentro da semana.
- **Contar tempo de espera dentro da jornada** ao validar disponibilidade do motorista.
- Em rota longa, só permitir "descanso em viagem" se o veículo estiver **parado** (não creditar descanso com veículo em movimento).

## 2. Tacógrafo (cronotacógrafo)

- **Obrigatório** para veículos de carga/passageiros pesados; lista atual em **Resolução CONTRAN 993/2023** (substituiu a 912/2022); requisitos técnicos em **Resolução CONTRAN 938/2022**. Base legal: CTB **art. 105, I**.
- **Aferição metrológica (INMETRO): a cada 2 anos** (NÃO anual) + sempre após reparo/quebra de lacre. RTM atual: **Portaria Inmetro 481/2021** (⚠️ **revogou a antiga Portaria 201/2004** — citação comum desatualizada) + **Portaria Inmetro 91/2022** (operação dos postos).
- **Digital × analógico:** ambos válidos. Retenção de registros: **24h disponíveis**, guardados **90 dias** (Res. 92/1999); em **acidente, 1 ano** (analógico) e **5 anos em mídia eletrônica** (Res. 938/2022 ⚠️ confirmar no texto consolidado).
- **Penalidade (CTB art. 230, XIV):** tacógrafo viciado/defeituoso = **infração GRAVE**, **R$ 195,23**, **5 pontos**, **retenção do veículo**.
- Fontes: [Inmetro — Cronotacógrafo/Legislação](https://cronotacografo.rbmlq.gov.br/legislacoes) · [gov.br/inmetro](https://www.gov.br/inmetro/pt-br/composicao/surrs/servicos/cronotacografos) · [Res. CONTRAN 938/2022 (ANTT)](https://anttlegis.antt.gov.br/action/ActionDatalegis.php?acao=detalharAto&tipo=RES&numeroAto=00000938&seqAto=000&valorAno=2022&orgao=CONTRAN/MI) · [CTB art. 230](https://ctbdigital.com.br/artigo/art230/)
- **Software:** alertar **vencimento da aferição (ciclo de 2 anos)** por veículo; bloquear veículo com aferição vencida ou lacre rompido.

## 3. Exame toxicológico (C/D/E)

- **Periódico: a cada 2 anos e 6 meses (30 meses)** para C/D/E **< 70 anos**, contado da obtenção/renovação, **independente da renovação da CNH**. ≥70 anos: só na renovação. — CTB **art. 148-A §2º** (Lei 14.071/2020, ajustada pela **Lei 14.599/2023**).
- **Janela de detecção: 90 dias** (cabelo/pelo). **Laudo válido 90 dias da coleta** (Res. CONTRAN 923/2022, alt. 1009/2024). ⚠️ São conceitos distintos (olhar para trás × prazo de uso).
- **Penalidade — não fazer o periódico (CTB art. 165-B/165-D):** após **30 dias** do vencimento, **infração gravíssima, multa 5x = R$ 1.467,35, 7 pontos**, "multa de balcão" automática (sem abordagem). **Suspensão do direito de dirigir por 3 meses** e, na **reincidência em 12 meses**, **multa 10x = R$ 2.934,70**. Levantamento da suspensão exige resultado negativo no Renach.
- **CLT — ⚠️ CORREÇÃO DA PREMISSA: é o art. 168 §§6º/7º, NÃO "art. 168-A".** Exame **na admissão e no desligamento** do motorista empregado (Lei 13.103/2015); janela de **90 dias**; aproveita o exame do CTB se feito **nos últimos 60 dias**; custeio do empregador. Regulamentação: **Portaria MTE 612/2024** (altera MTP 672/2021).
- **Mudança 2024:** Deliberação CONTRAN 272/2024 prorrogou prazos; multas do periódico em vigor desde mai/2024.
- Fontes: [Senado — exame vira infração](https://www12.senado.leg.br/noticias/materias/2023/10/04/congresso-derruba-vetos-e-torna-ausencia-de-exame-toxicologico-infracao-de-transito) · [Min. Transportes — +30 dias](https://www.gov.br/transportes/pt-br/assuntos/noticias/2024/04/exame-toxicologico-condutores-que-perderam-o-prazo-tem-mais-30-dias-para-nao-serem-multados) · [CTB (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm)
- **Software:** alerta aos **60/30 dias** do vencimento dos 30 meses; **bloquear alocação** de motorista C/D/E com toxicológico vencido > 30 dias (risco de suspensão).

## 4. MOPP e NR-20

- **MOPP** (transporte de produtos perigosos): base CTB **art. 145**; curso pela **Res. CONTRAN 168/2004** (formação consolidada na 789/2020). **Carga horária 50h**, **validade ~5 anos** (⚠️ confirmar no texto CONTRAN; atrelada ao ciclo do exame médico). RTPP vigente: **ANTT Res. 5.998/2022** (⚠️ **NÃO** Decreto 10.605/2021 — esse é sobre fertilizantes; o regulamento é o **Decreto 96.044/1988**).
- **⚠️ GUINCHO/REBOQUE de veículo SINISTRADO — MOPP em regra NÃO se aplica.** Há isenção expressa para **guinchos de socorro que rebocam veículos avariados/sinistrados** que contiveram/contêm produtos perigosos, reforçada pelas isenções de **combustível de propulsão** e **quantidade limitada** (que dispensam o curso). ⚠️ A redação literal cita "socorro"; operação comercial de plataforma é interpretativamente equivalente, mas confirme o **item exato (≈1.1.1 das Instruções Complementares da Res. 5.998/2022)**. MOPP **passa a ser exigido** se transportar combustível/óleo drenado, tanques transferidos para recipientes, ou carga perigosa recuperada. [ANTT — Produtos Perigosos](https://www.gov.br/antt/pt-br/assuntos/cargas/produtos-perigosos) · [ANTT FAQ](https://portal.antt.gov.br/en/perguntas-frequentes/-/categories/362298)
- **NR-20** (inflamáveis/combustíveis): aplica-se a **armazenamento/manuseio/transferência** de combustível **no ambiente de trabalho** (ex.: tanque próprio, dreno de combustível de sinistrados), não ao ato de transporte. Reciclagem: **Básico 3 anos**, **Intermediário 2 anos**, **Avançado I/II anual** (item 20.11, 4h cada). Versão atual: **NR-20 atualizada 2025** (Portaria MTE 60/2025, alterou só Anexo III). [NR-20 (gov.br PDF)](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-20-atualizada-2025.pdf)

## 5. CNH — categorias e vencimento

- **Categorias (CTB art. 143):** **C** = carga PBT > 3.500 kg; **D** = passageiros lotação > 8 lugares; **E** = combinação com unidade acoplada/reboque ≥ 6.000 kg PBT (ou lotação > 8).
- **Validade por idade (CTB art. 147 §2º, Lei 14.071/2020):** **< 50 anos → 10 anos**; **50 a < 70 → 5 anos**; **≥ 70 → 3 anos**.
- **⚠️ CORREÇÃO DA PREMISSA:** atividade remunerada (EAR) **NÃO encurta** o intervalo do exame médico — apenas **adiciona avaliação psicológica** na renovação (art. 147 §3º). O prazo curto que vale para C/D/E é o **toxicológico de 2,5 anos** (item 3).
- **Toxicológico × CNH (art. 148-A):** exigido na **obtenção e renovação** de C/D/E, + periódico de 30 meses independente da renovação.
- **NOVO — Lei 15.153/2025** (vigência **10/12/2025**): estende o toxicológico à **primeira habilitação A/B** (⚠️ ainda **não** à renovação de A/B; regulamentação CONTRAN/Senatran em curso). [Lei 15.153/2025 (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15153.htm) · [Senado](https://www12.senado.leg.br/noticias/materias/2025/12/04/derrubados-quatro-vetos-a-mudancas-no-codigo-de-transito)
- **Software:** alerta de vencimento da CNH conforme idade; bloquear motorista com CNH vencida ou categoria insuficiente para a OS (ex.: combinação ≥6.000 kg exige E).

---
### Itens a confirmar no texto consolidado antes de publicar
1. Numeração atual dos §§ do art. 235-C (tempo de espera) pós-ADI 5322.
2. Retenção de 5 anos em mídia eletrônica (Res. CONTRAN 938/2022) vs. 1 ano (Res. 92/1999).
3. Item exato da isenção do guincho de socorro na Res. ANTT 5.998/2022.
4. Validade formal de 5 anos do MOPP no texto CONTRAN.
