"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Simulador Financeiro + Comparador (S05)
// ============================================================

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

type Baseline = {
  receitaMensal: number;
  despesaMensal: number;
  dieselMensal: number;
  precoMedioDiesel: number;
  kmMensal: number;
  consumoMedioKmL: number;
};

type MesProjetado = {
  mes: number;
  receita: number;
  custoDiesel: number;
  custoFixo: number;
  custoExtra: number;
  custoTotal: number;
  margem: number;
  margemPct: number;
  caixaAcumulado: number;
};

type Resultado = {
  baseline: Baseline;
  meses: MesProjetado[];
  totais: { receita: number; custo: number; margem: number; margemPct: number };
};

type Cenario = { id: string; nome: string; descricao?: string | null };

type Comparacao = { id: string; nome: string; resultado: Resultado };

type Taxas = { cdiAnualPct: number; selicAnualPct: number; referencia: string; fonte: string };

type ResultadoFinanciamento = {
  parcela: number;
  numParcelas: number;
  viavel: boolean;
  mesesEmRisco: { mes: number; margem: number; caixaAcumulado: number }[];
  aumentoMetaFaturamento: number;
  caixaFinalSemParcela: number;
  caixaFinalComParcela: number;
  custoTotalFinanciamento: number;
};

type CenarioInvestimento = {
  cenario: string;
  descricao: string;
  tirAnualPct: number | null;
  vpl: number;
  paybackMeses: number | null;
  valorFinal: number;
};

type ResultadoInvestimento = {
  taxas: Taxas;
  cenarios: CenarioInvestimento[];
  recomendado: string;
};

const NOME_CENARIO: Record<string, string> = {
  APLICAR_CDI: "Aplicar no CDI",
  ANTECIPAR_DIVIDA: "Antecipar dívida",
  REINVESTIR_OPERACAO: "Reinvestir na operação",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function SimuladorPage() {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [comparacao, setComparacao] = useState<Comparacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [simulando, setSimulando] = useState(false);

  const [meses, setMeses] = useState(12);
  const [varReceita, setVarReceita] = useState(0);
  const [varCusto, setVarCusto] = useState(0);
  const [precoDiesel, setPrecoDiesel] = useState("");
  const [kmMensal, setKmMensal] = useState("");
  const [custoExtra, setCustoExtra] = useState("");
  const [nomeCenario, setNomeCenario] = useState("");

  const [taxas, setTaxas] = useState<Taxas | null>(null);
  const [valorParcela, setValorParcela] = useState("");
  const [numParcelas, setNumParcelas] = useState(24);
  const [resFinanciamento, setResFinanciamento] = useState<ResultadoFinanciamento | null>(null);
  const [invValor, setInvValor] = useState("");
  const [invMeses, setInvMeses] = useState(12);
  const [invTaxaDivida, setInvTaxaDivida] = useState("");
  const [invRetorno, setInvRetorno] = useState("");
  const [resInvestimento, setResInvestimento] = useState<ResultadoInvestimento | null>(null);

  function premissas() {
    return {
      mesesProjecao: meses,
      variacaoReceitaPct: varReceita,
      variacaoCustoFixoPct: varCusto,
      precoDiesel: precoDiesel ? Number(precoDiesel) : undefined,
      kmMensal: kmMensal ? Number(kmMensal) : undefined,
      custoExtraMensal: custoExtra ? Number(custoExtra) : undefined,
    };
  }

  async function carregarCenarios() {
    setCenarios(toList<Cenario>(await api.get("/simulador/cenarios")));
  }

  useEffect(() => {
    api.get<Baseline>("/simulador/baseline").then(setBaseline).catch((e) => setErro((e as Error).message));
    api.get<Taxas>("/simulador/taxas").then(setTaxas).catch(() => {});
    carregarCenarios().catch(() => {});
  }, []);

  async function simularFinanciamento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      setResFinanciamento(
        await api.post<ResultadoFinanciamento>("/simulador/financiamento", {
          valorParcela: Number(valorParcela),
          numParcelas,
        })
      );
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function compararInvestimento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      setResInvestimento(
        await api.post<ResultadoInvestimento>("/simulador/comparar-investimento", {
          valor: Number(invValor),
          meses: invMeses,
          taxaDividaAnualPct: invTaxaDivida ? Number(invTaxaDivida) : undefined,
          retornoReinvestimentoAnualPct: invRetorno ? Number(invRetorno) : undefined,
        })
      );
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function simular(e: React.FormEvent) {
    e.preventDefault();
    setSimulando(true);
    setErro(null);
    try {
      setResultado(await api.post<Resultado>("/simulador/simular", premissas()));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSimulando(false);
    }
  }

  async function salvarCenario() {
    if (!nomeCenario.trim()) {
      setErro("Dê um nome ao cenário antes de salvar");
      return;
    }
    try {
      await api.post("/simulador/cenarios", { nome: nomeCenario, ...premissas() });
      setNomeCenario("");
      carregarCenarios();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function excluirCenario(id: string) {
    try {
      await api.delete(`/simulador/cenarios/${id}`);
      setSelecionados((s) => s.filter((x) => x !== id));
      carregarCenarios();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function comparar() {
    if (selecionados.length < 2) {
      setErro("Selecione pelo menos 2 cenários para comparar");
      return;
    }
    setErro(null);
    try {
      const res = await api.get<Comparacao[]>(`/simulador/comparar?ids=${selecionados.join(",")}`);
      setComparacao(toList<Comparacao>(res));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Shell title="Simulador Financeiro" subtitle="Projeção de caixa com premissas ajustáveis + comparador de cenários">
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {baseline && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <p className="text-[12px] font-medium text-zinc-500 mb-1">Receita média/mês (90d)</p>
              <span className="font-mono tabular-nums text-[20px] font-semibold text-zinc-900">{fmt(baseline.receitaMensal)}</span>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <p className="text-[12px] font-medium text-zinc-500 mb-1">Despesa média/mês (90d)</p>
              <span className="font-mono tabular-nums text-[20px] font-semibold text-zinc-900">{fmt(baseline.despesaMensal)}</span>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <p className="text-[12px] font-medium text-zinc-500 mb-1">Diesel médio (R$/L)</p>
              <span className="font-mono tabular-nums text-[20px] font-semibold text-zinc-900">
                R$ {baseline.precoMedioDiesel.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <p className="text-[12px] font-medium text-zinc-500 mb-1">Km médio/mês</p>
              <span className="font-mono tabular-nums text-[20px] font-semibold text-zinc-900">
                {Math.round(baseline.kmMensal).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={simular} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-zinc-900">Premissas da simulação</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Meses de projeção">
              <input type="number" min={1} max={36} className={inputCls + " font-mono tabular-nums"} value={meses} onChange={(e) => setMeses(Number(e.target.value))} />
            </Field>
            <Field label="Variação da receita (%)">
              <input type="number" step="0.5" className={inputCls + " font-mono tabular-nums"} value={varReceita} onChange={(e) => setVarReceita(Number(e.target.value))} />
            </Field>
            <Field label="Variação custo fixo (%)">
              <input type="number" step="0.5" className={inputCls + " font-mono tabular-nums"} value={varCusto} onChange={(e) => setVarCusto(Number(e.target.value))} />
            </Field>
            <Field label={`Preço diesel (R$/L) — atual ${baseline ? baseline.precoMedioDiesel.toFixed(2) : "..."}`}>
              <input type="number" step="0.01" className={inputCls + " font-mono tabular-nums"} value={precoDiesel} onChange={(e) => setPrecoDiesel(e.target.value)} placeholder="usar média" />
            </Field>
            <Field label="Km/mês (deixe vazio p/ média)">
              <input type="number" className={inputCls + " font-mono tabular-nums"} value={kmMensal} onChange={(e) => setKmMensal(e.target.value)} placeholder="usar média" />
            </Field>
            <Field label="Custo extra mensal (R$)">
              <input type="number" step="0.01" className={inputCls + " font-mono tabular-nums"} value={custoExtra} onChange={(e) => setCustoExtra(e.target.value)} placeholder="ex: novo financiamento" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={simulando}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {simulando ? "Simulando..." : "Simular"}
            </button>
            <input className={inputCls + " max-w-[240px]"} value={nomeCenario} onChange={(e) => setNomeCenario(e.target.value)} placeholder="Nome do cenário" />
            <button
              type="button"
              onClick={salvarCenario}
              className="rounded-xl border border-[#E63A1F] text-[#E63A1F] text-[13px] font-medium px-4 py-2.5 hover:bg-[#E63A1F]/5 transition-colors"
            >
              Salvar como cenário
            </button>
          </div>
        </form>

        {resultado && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-900">Projeção — {resultado.meses.length} meses</h2>
              <span
                className="font-mono tabular-nums text-[13px] font-semibold"
                style={{ color: resultado.totais.margem >= 0 ? "#16A34A" : "#C0392B" }}
              >
                Margem total: {fmt(resultado.totais.margem)} ({resultado.totais.margemPct.toFixed(1)}%)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    {["Mês", "Receita", "Diesel", "Custo fixo", "Extra", "Margem", "Caixa acum."].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.meses.map((m) => (
                    <tr key={m.mes} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 font-mono tabular-nums text-zinc-500">{m.mes}</td>
                      <td className="px-5 py-3 font-mono tabular-nums text-zinc-900">{fmt(m.receita)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums text-zinc-600">{fmt(m.custoDiesel)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums text-zinc-600">{fmt(m.custoFixo)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums text-zinc-600">{fmt(m.custoExtra)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums font-semibold" style={{ color: m.margem >= 0 ? "#16A34A" : "#C0392B" }}>
                        {fmt(m.margem)}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums font-semibold" style={{ color: m.caixaAcumulado >= 0 ? "#16A34A" : "#C0392B" }}>
                        {fmt(m.caixaAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-zinc-900">Cenários salvos</h2>
            <button
              onClick={comparar}
              className="rounded-xl bg-[#E63A1F] text-white text-[12px] font-medium px-3.5 py-2 hover:bg-[#BC2F19] transition-colors"
            >
              Comparar selecionados ({selecionados.length})
            </button>
          </div>
          {cenarios.length === 0 ? (
            <p className="px-5 py-8 text-center text-zinc-400 text-[13px]">Nenhum cenário salvo ainda</p>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {cenarios.map((c) => (
                <li key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(c.id)}
                    onChange={(e) =>
                      setSelecionados((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))
                    }
                    className="h-4 w-4 accent-[#E63A1F]"
                  />
                  <span className="text-[13px] font-medium text-zinc-900 flex-1">{c.nome}</span>
                  <button onClick={() => excluirCenario(c.id)} className="text-[12px] text-[#C0392B] hover:underline">
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {comparacao.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-[13px] font-semibold text-zinc-900">Comparador de cenários</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Indicador</th>
                    {comparacao.map((c) => (
                      <th key={c.id} className="px-5 py-3 font-semibold text-zinc-900 text-[12px]">{c.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rot: "Receita total", get: (r: Resultado) => fmt(r.totais.receita) },
                    { rot: "Custo total", get: (r: Resultado) => fmt(r.totais.custo) },
                    { rot: "Margem total", get: (r: Resultado) => fmt(r.totais.margem) },
                    { rot: "Margem %", get: (r: Resultado) => `${r.totais.margemPct.toFixed(1)}%` },
                    { rot: "Caixa final", get: (r: Resultado) => fmt(r.meses[r.meses.length - 1]?.caixaAcumulado ?? 0) },
                  ].map((linha) => (
                    <tr key={linha.rot} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 text-zinc-500">{linha.rot}</td>
                      {comparacao.map((c) => (
                        <td key={c.id} className="px-5 py-3 font-mono tabular-nums font-semibold text-zinc-900">
                          {linha.get(c.resultado)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={simularFinanciamento} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Posso assumir essa parcela?</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor da parcela (R$)">
                <input type="number" step="0.01" required className={inputCls + " font-mono tabular-nums"} value={valorParcela} onChange={(e) => setValorParcela(e.target.value)} />
              </Field>
              <Field label="Nº de parcelas">
                <input type="number" min={1} max={120} className={inputCls + " font-mono tabular-nums"} value={numParcelas} onChange={(e) => setNumParcelas(Number(e.target.value))} />
              </Field>
            </div>
            <button type="submit" className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors">
              Simular financiamento
            </button>
            {resFinanciamento && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <p className="text-[14px] font-semibold" style={{ color: resFinanciamento.viavel ? "#16A34A" : "#C0392B" }}>
                  {resFinanciamento.viavel
                    ? "✓ Parcela viável — nenhum mês em risco na projeção"
                    : `✗ ${resFinanciamento.mesesEmRisco.length} mês(es) em risco`}
                </p>
                <p className="text-[13px] text-zinc-600">
                  Custo total: <span className="font-mono">{fmt(resFinanciamento.custoTotalFinanciamento)}</span> ·
                  Caixa final: <span className="font-mono">{fmt(resFinanciamento.caixaFinalSemParcela)}</span> →{" "}
                  <span className="font-mono">{fmt(resFinanciamento.caixaFinalComParcela)}</span>
                </p>
                <p className="text-[13px] text-zinc-600">
                  Aumento de meta de faturamento necessário:{" "}
                  <span className="font-mono font-semibold">{fmt(resFinanciamento.aumentoMetaFaturamento)}/mês</span>
                </p>
                {resFinanciamento.mesesEmRisco.length > 0 && (
                  <p className="text-[12px] text-[#C0392B]">
                    Meses em risco: {resFinanciamento.mesesEmRisco.map((m) => m.mes).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form>

          <form onSubmit={compararInvestimento} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-900">Aplicar × Antecipar × Reinvestir</h2>
              {taxas && (
                <span className="text-[11px] text-zinc-400">
                  CDI {taxas.cdiAnualPct}% a.a. · {taxas.referencia}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor disponível (R$)">
                <input type="number" step="0.01" required className={inputCls + " font-mono tabular-nums"} value={invValor} onChange={(e) => setInvValor(e.target.value)} />
              </Field>
              <Field label="Prazo (meses)">
                <input type="number" min={1} max={120} className={inputCls + " font-mono tabular-nums"} value={invMeses} onChange={(e) => setInvMeses(Number(e.target.value))} />
              </Field>
              <Field label="Taxa da dívida (% a.a.)">
                <input type="number" step="0.1" className={inputCls + " font-mono tabular-nums"} value={invTaxaDivida} onChange={(e) => setInvTaxaDivida(e.target.value)} placeholder="opcional" />
              </Field>
              <Field label="Retorno reinvestimento (% a.a.)">
                <input type="number" step="0.1" className={inputCls + " font-mono tabular-nums"} value={invRetorno} onChange={(e) => setInvRetorno(e.target.value)} placeholder="opcional" />
              </Field>
            </div>
            <button type="submit" className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors">
              Comparar cenários
            </button>
            {resInvestimento && (
              <div className="pt-2 border-t border-zinc-100 space-y-2">
                {resInvestimento.cenarios.map((c) => (
                  <div key={c.cenario} className="flex items-center justify-between text-[13px]">
                    <span className={c.cenario === resInvestimento.recomendado ? "font-semibold text-[#16A34A]" : "text-zinc-600"}>
                      {c.cenario === resInvestimento.recomendado ? "★ " : ""}
                      {NOME_CENARIO[c.cenario] ?? c.cenario}
                      {c.tirAnualPct != null ? ` (TIR ${c.tirAnualPct}%)` : ""}
                      {c.paybackMeses != null ? ` · payback ${c.paybackMeses}m` : ""}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-900">
                      {fmt(c.valorFinal)}
                      {c.vpl !== 0 && <span className="text-[11px] text-zinc-400"> (VPL {fmt(c.vpl)})</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </Shell>
  );
}
