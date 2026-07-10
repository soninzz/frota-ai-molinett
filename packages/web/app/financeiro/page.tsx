"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Financeiro (conectado à API real)
// Cole em: packages/web/app/financeiro/page.tsx
// ============================================================

type PainelFinanceiro = {
  metas: { faturamentoMinimo: number; kmMaximo: number; mesReferencia: string };
  saldoARecuperar: number;
  alertas: {
    aVencer7dias: { total: number; valor: number };
    aVencer30dias: { total: number; valor: number };
    atrasados: { total: number; valor: number };
  };
  fluxo30dias: { totais: { entradas: number; saidas: number } };
};

type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  tipo: string;
};

type Dre = {
  mes: string;
  grupos: Record<string, { receita: number; despesa: number }>;
  receitaTotal: number;
  despesaTotal: number;
  resultadoLiquido: number;
  margemPct: number;
};

type FluxoCaixa = {
  totais: { entradas: number; saidas: number };
  curva: { dia: string; entradas: number; saidas: number; saldoAcumulado: number }[];
};

export default function FinanceiroPage() {
  const [painel, setPainel] = useState<PainelFinanceiro | null>(null);
  const [proximos, setProximos] = useState<Lancamento[]>([]);
  const [dre, setDre] = useState<Dre | null>(null);
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/financeiro/painel"),
      api.get("/financeiro/lancamentos"),
      api.get<Dre>("/financeiro/dre"),
      api.get<FluxoCaixa>("/financeiro/fluxo-caixa?dias=90"),
    ])
      .then(([p, l, d, f]) => {
        setPainel(p as PainelFinanceiro);
        setProximos(toList<Lancamento>(l).slice(0, 6));
        setDre(d);
        setFluxo(f);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const saldoProjetado = painel ? painel.fluxo30dias.totais.entradas - painel.fluxo30dias.totais.saidas : 0;
  const pctFaturamento = painel?.metas.faturamentoMinimo
    ? Math.min(100, Math.round((painel.fluxo30dias.totais.entradas / painel.metas.faturamentoMinimo) * 100))
    : 0;

  return (
    <Shell title="Financeiro" subtitle="Fluxo de caixa projetado e metas dinâmicas">
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-zinc-900 rounded-2xl p-6 relative overflow-hidden lg:col-span-2">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#16A34A]/20 blur-2xl" />
                <p className="text-[12px] font-medium text-zinc-400 mb-1">Saldo projetado — próximos 30 dias</p>
                <div className="flex items-end gap-3">
                  <span className="font-mono tabular-nums text-[42px] leading-none font-semibold text-white tracking-tight">
                    {fmt(saldoProjetado)}
                  </span>
                  <span
                    className={`text-[13px] font-medium pb-1.5 ${
                      saldoProjetado >= 0 ? "text-[#16A34A]" : "text-[#C0392B]"
                    }`}
                  >
                    {saldoProjetado >= 0 ? "saldo positivo" : "atenção — saldo negativo"}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-400 mt-3">
                  {fmt(painel?.fluxo30dias.totais.entradas ?? 0)} a receber previstos ·{" "}
                  {fmt(painel?.fluxo30dias.totais.saidas ?? 0)} em despesas
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                <p className="text-[12px] font-medium text-zinc-500 mb-1">Saldo a recuperar</p>
                <span className="font-mono tabular-nums text-[26px] font-semibold text-[#C0392B]">
                  {fmt(painel?.saldoARecuperar ?? 0)}
                </span>
                <p className="text-[11px] text-zinc-400 mt-2">acumulado de margens negociadas</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">Metas do mês</h2>
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[12px] text-zinc-500">
                    Faturamento mínimo — {fmt(painel?.fluxo30dias.totais.entradas ?? 0)} /{" "}
                    {fmt(painel?.metas.faturamentoMinimo ?? 0)}
                  </span>
                  <span className="font-mono tabular-nums text-[12px] font-medium text-zinc-900">
                    {pctFaturamento}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${pctFaturamento}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                <p className="text-[11px] font-medium text-zinc-500 mb-1">A vencer em 7 dias</p>
                <span className="font-mono tabular-nums text-[18px] font-semibold text-zinc-900">
                  {fmt(painel?.alertas.aVencer7dias.valor ?? 0)}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                <p className="text-[11px] font-medium text-zinc-500 mb-1">A vencer em 30 dias</p>
                <span className="font-mono tabular-nums text-[18px] font-semibold text-zinc-900">
                  {fmt(painel?.alertas.aVencer30dias.valor ?? 0)}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                <p className="text-[11px] font-medium text-zinc-500 mb-1">Atrasados</p>
                <span className="font-mono tabular-nums text-[18px] font-semibold text-[#C0392B]">
                  {fmt(painel?.alertas.atrasados.valor ?? 0)}
                </span>
              </div>
            </div>

            {dre && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[13px] font-semibold text-zinc-900">DRE — {dre.mes}</h2>
                  <span
                    className="font-mono tabular-nums text-[13px] font-semibold"
                    style={{ color: dre.resultadoLiquido >= 0 ? "#16A34A" : "#C0392B" }}
                  >
                    {fmt(dre.resultadoLiquido)} ({dre.margemPct}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  {Object.entries(dre.grupos).map(([grupo, v]) => (
                    <div key={grupo} className="flex items-center justify-between border-b border-zinc-50 pb-1.5">
                      <span className="text-zinc-500">{grupo}</span>
                      <span className="font-mono tabular-nums text-zinc-900">
                        {fmt(v.receita - v.despesa)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(dre.grupos).length === 0 && (
                    <p className="text-zinc-400 col-span-2">Sem lançamentos classificados por grupo contábil este mês</p>
                  )}
                </div>
              </div>
            )}

            {fluxo && fluxo.curva.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h2 className="text-[13px] font-semibold text-zinc-900">Fluxo de caixa projetado — próximos 90 dias</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left">
                        <th className="px-5 py-2.5 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Dia</th>
                        <th className="px-5 py-2.5 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Entradas</th>
                        <th className="px-5 py-2.5 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Saídas</th>
                        <th className="px-5 py-2.5 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Saldo acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxo.curva.slice(0, 10).map((d) => (
                        <tr key={d.dia} className="border-b border-zinc-50 last:border-0">
                          <td className="px-5 py-2 font-mono tabular-nums text-zinc-500">
                            {new Date(d.dia).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-5 py-2 font-mono tabular-nums text-[#16A34A] text-right">{fmt(d.entradas)}</td>
                          <td className="px-5 py-2 font-mono tabular-nums text-zinc-600 text-right">{fmt(d.saidas)}</td>
                          <td
                            className="px-5 py-2 font-mono tabular-nums font-medium text-right"
                            style={{ color: d.saldoAcumulado >= 0 ? "#16A34A" : "#C0392B" }}
                          >
                            {fmt(d.saldoAcumulado)}
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
                <h2 className="text-[13px] font-semibold text-zinc-900">Próximos lançamentos</h2>
                <a href="/financeiro/lancamentos" className="text-[12px] font-medium text-[#1E4C8C] hover:underline">
                  Ver todos
                </a>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {proximos.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-zinc-400 text-[13px]">Nenhum lançamento</td>
                    </tr>
                  )}
                  {proximos.map((l) => (
                    <tr key={l.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3.5 text-zinc-700">{l.descricao}</td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">
                        {new Date(l.vencimento).toLocaleDateString("pt-BR")}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono tabular-nums font-medium ${
                          l.tipo === "R" ? "text-[#16A34A]" : "text-zinc-900"
                        }`}
                      >
                        {l.tipo === "R" ? "+" : ""}
                        {fmt(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}