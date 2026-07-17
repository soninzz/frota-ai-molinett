# Pesquisa jurídico-fiscal — Sistema de gestão para transportadora (reboque/guincho)

**Estado em junho/2026 · fontes oficiais (.gov.br / planalto.gov.br).** Atividade: serviços de reboque/guincho (transporte de carga), Lucro Presumido (PIS/COFINS/IRPJ/CSLL) hoje, ISS sobre o serviço.

---

## 1. Reforma Tributária do consumo — CBS e IBS

**Marcos legais**
- **EC 132/2023** (20/12/2023) — criou IVA Dual: **IBS** (Estados+Municípios), **CBS** (União) e **Imposto Seletivo**; regras de transição no ADCT. <https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm>
- **LC 214/2025** (16/01/2025) — lei geral que institui IBS, CBS e IS. <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>
- **LC 227/2026** (13/01/2026) — cria o **Comitê Gestor do IBS (CGIBS)**, que administra/fiscaliza/cobra o IBS. <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm>
- **Decreto 12.955/2026** (29/04/2026) — regulamenta a CBS. <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>

**Quem substitui o quê:** CBS → PIS/COFINS; IBS → ICMS+ISS; IS = novo (extrafiscal).
Referência RFB: <https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda>

**Cronograma (parametrizar alíquota por competência/data da operação):**
| Ano | Regra |
|---|---|
| **2026** | Ano-teste. **CBS 0,9% + IBS 0,1%**; compensados com PIS/COFINS e **recolhimento dispensado** se cumpridas as obrigações acessórias (**art. 348, LC 214/2025**). |
| **2027** | CBS cheia, **PIS/COFINS extintos**; IS começa; IPI a zero (salvo ZFM). |
| **2029–2032** | IBS sobe e ICMS/ISS caem em décimos: **10/20/30/40%** (IBS) vs **90/80/70/60%**. |
| **2033** | Modelo pleno; **ICMS e ISS extintos**. |

**Alíquota de referência:** estimativa oficial **~26,5%** (IBS 8,8% + CBS 17,7%) em Nota Técnica SERTMF/Fazenda — é **estimativa, não alíquota legal**; teto/"trava" fixado anualmente pelo Senado. *(Valor legal do teto: **verificar** na EC 132/ADCT.)* <https://www.gov.br/fazenda/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria/perguntas-e-respostas/como-sera-a-transicao-para>

**Transporte / Simples / Lucro Presumido:**
- **Transporte de CARGA (reboque): sem regime reduzido específico** identificado (a LC 214 só dá regime específico ao **transporte coletivo de passageiros**). Reduções de 30%/60%/0% são para outros setores. → **verificar** alíquota setorial nos artigos da LC 214.
- **Simples mantido**; optante pode recolher IBS/CBS no DAS **ou** "por fora" no regime regular (gera/transfere crédito). **Resolução CGSN 186/2026**: opção pelo regime regular de **1º a 30/09/2026**, efeitos **01/01/2027**. <https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/abril/cgsn-define-prazos-de-opcao-pelo-simples-nacional-e-pelo-regime-regular-do-ibs-e-da-cbs-para-2027>
- **Lucro Presumido:** IBS/CBS apurados no regime **não cumulativo padrão** (crédito amplo).

**O que vira software já em 2026:** desde **01/01/2026** os DF-e (NF-e, NFC-e, **CT-e/CT-e OS**, NFS-e, NFCom) devem destacar **IBS/CBS** por operação (NTs RTC). → parametrizar **grupos IBS/CBS/IS** e **alíquota por competência**. <https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-consumo/orientacoes-2026>

---

## 2. Documentos fiscais eletrônicos

| Doc | Modelo | Emite | Caso reboque |
|---|---|---|---|
| NF-e | 55 | venda de mercadoria | peças/insumos |
| NFC-e | 65 | varejo consumidor | — |
| **CT-e** | **57** | **transportador (carga)** | **DOCUMENTO DA OPERAÇÃO DE REBOQUE/GUINCHO** |
| CT-e OS | 67 | passageiros/valores/bagagem | não se aplica |
| NFS-e | nac. | serviços municipais | demais serviços (não-transporte) |
| NFCom | 62 | telecom | **não se aplica** |

- **Reboque/guincho = transporte de carga → CT-e modelo 57**, não NFS-e nem CT-e OS (entendimento SEFAZ-MT, consistente com a definição nacional). Portal: <https://www.cte.fazenda.gov.br> · NT RTC do CT-e: **2025.001** (versão exata: **verificar** no portal).
- **NFS-e padrão nacional + ADN (Ambiente de Dados Nacional)**: adesão obrigatória dos municípios (**art. 62, LC 214/2025**) desde 2026; leiaute nacional **XSD v1.01 (09/02/2026)**. <https://www.gov.br/nfse> · <https://www.gov.br/nfse/pt-br/municipios/produtos-disponiveis/ambiente-de-dados-nacional-adn>
- **NF-e/NFC-e**: NT RTC **2025.002** insere IBS/CBS/IS. <https://www.nfe.fazenda.gov.br>
- **"Nota Fiscal Nacional":** **não** existe documento único; é **padronização + repositório central de DF-e** sob o CGIBS. → *verificar* o termo como produto.

**Como obter dados de NF emitida (requisitos):**
- **XML assinado**, **chave de acesso 44 dígitos**; leiaute no MOC (NF-e/CT-e).
- **Webservice `NFeDistribuicaoDFe`** (NT 2014.002): puxa DF-e por **NSU** (destinatário/transportador), retroativo **90 dias**. <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=wLVBlKchUb4%3D>
- **Manifestação do destinatário** (Ciência/Confirmação) — pré-requisito p/ XML de terceiros; **consulta por chave** no portal.
- **QR Code (NFC-e/DANFE):** chave + hash assinado com **CSC**; NFS-e nacional também tem DANFSe c/ QR Code.
- **Certificado digital e-CNPJ (ICP-Brasil)** obrigatório p/ webservices (TLS mútuo + assinatura).

---

## 3. LGPD (Lei 13.709/2018)

Texto: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm> · ANPD: <https://www.gov.br/anpd>

- **Princípios (art. 6º):** finalidade, necessidade (mínimo), transparência, segurança, responsabilização.
- **Base legal por dado:**
  - CPF/CNPJ de clientes/fornecedores p/ fiscal → **obrigação legal (art. 7º, II)** + contrato (V).
  - **GPS em tempo real de motoristas** → **legítimo interesse (art. 7º, IX)** com **teste de balanceamento (LIA) documentado** (Guia ANPD). <https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia_legitimo_interesse.pdf>
  - **Biometria de voz = dado SENSÍVEL (art. 5º, II)** → exige **art. 11**: consentimento **específico e destacado (I)** ou, se p/ autenticação, prevenção à fraude (**II, "g"**). *Legítimo interesse NÃO vale p/ sensível.*
- **Direitos do titular (art. 18):** acesso, correção, eliminação, portabilidade, info de compartilhamento, revogação → o sistema precisa **exportar/corrigir/anonimizar/eliminar/listar compartilhamentos**. Prazo de **15 dias** p/ acesso (art. 19); prazo geral único: **não existe na lei (verificar)**.
- **Trilha de auditoria = registro das operações (art. 37)** — obrigatório, sobretudo p/ GPS sob legítimo interesse. **RIPD (art. 38)** recomendado (biometria + GPS). **Encarregado/DPO (art. 41)** com contato público.
- **Segurança (art. 46):** criptografia, controle de acesso, logs.
- **Incidente:** comunicar ANPD e titulares em **3 dias úteis** (**Resolução CD/ANPD 15/2024**). <https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca>
- **Sanções (art. 52):** multa até **2% do faturamento, teto R$ 50 mi/infração** (dosimetria: **Res. 4/2023**). **ME/EPP** (Res. 2/2022): DPO facultativo, **prazos em dobro**.
- **Rastreamento de empregados:** **sem guia específico da ANPD (verificar)** — aplicar legítimo interesse + proporcionalidade/transparência/finalidade (limitar GPS à jornada); limites trabalhistas (TST) fora do escopo ANPD.

---

### Pendências marcadas "verificar"
1. Teto legal de 26,5% (é estimativa SERTMF, não lei). 2. Alíquota setorial de transporte de carga na LC 214. 3. Versões/datas exatas das NTs 2025.002 (NF-e) e 2025.001 (CT-e) — portais em loop de redirect. 4. Prazo geral único do art. 18 (lei só fixa 15 dias p/ acesso). 5. Guia ANPD específico de monitoramento de empregados.
