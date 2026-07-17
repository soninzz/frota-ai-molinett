"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Dashboard principal (conectado à API real)
// Cole em: packages/web/app/dashboard/page.tsx
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

type PainelVeiculo = { id: string; alertas: { revisoesCriticas: number; documentosAVencer: number; segurosAVencer: number } };

type PontoFluxo = { dia: string; entradas: number; saidas: number; saldoAcumulado: number };
type FluxoCaixa = { curva: PontoFluxo[] };

function GraficoFluxoCaixa({ pontos }: { pontos: PontoFluxo[] }) {
  const dados = pontos.map((p) => ({
    ...p,
    diaCurto: new Date(p.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));

  if (dados.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 h-[280px] flex items-center justify-center">
        <p className="text-[13px] text-zinc-400">Sem lançamentos previstos nos próximos 30 dias</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-zinc-900">Fluxo de caixa projetado (30 dias)</h2>
        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#16A34A]" />Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#C0392B]" />Saídas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E63A1F]" />Saldo acumulado</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={dados} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="corSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E63A1F" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#E63A1F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
          <XAxis dataKey="diaCurto" tick={{ fontSize: 11, fill: "#A1A1AA" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#A1A1AA" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            contentStyle={{ borderRadius: 12, border: "1px solid #E4E4E7", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="entradas" stroke="#16A34A" fill="#16A34A" fillOpacity={0.08} strokeWidth={2} />
          <Area type="monotone" dataKey="saidas" stroke="#C0392B" fill="#C0392B" fillOpacity={0.08} strokeWidth={2} />
          <Area type="monotone" dataKey="saldoAcumulado" stroke="#E63A1F" fill="url(#corSaldo)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaPositive = true,
  accent = "#E63A1F",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accent?: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent }} />
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-bold text-zinc-900 tracking-tight leading-none font-mono tabular-nums">
          {value}
        </span>
        {delta && (
          <span className={`text-[12px] font-semibold ${deltaPositive ? "text-[#16A34A]" : "text-[#C0392B]"}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function ModuleCard({ href, icon, title, desc, metric }: { href: string; icon: string; title: string; desc: string; metric: string }) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl border border-zinc-200 p-5 hover:border-[#E63A1F]/50 hover:shadow-[0_4px_20px_-4px_rgba(230,58,31,0.15)] transition-all overflow-hidden"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#E63A1F]/0 group-hover:bg-[#E63A1F]/[0.06] blur-xl transition-colors" />
      <div className="relative flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-[#E63A1F]/[0.08] flex items-center justify-center text-[#E63A1F] text-[15px] group-hover:bg-[#E63A1F] group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-bold font-mono tabular-nums text-zinc-400 group-hover:text-[#E63A1F] transition-colors tracking-wide">
          {metric}
        </span>
      </div>
      <h3 className="relative text-[14px] font-bold text-zinc-900 mb-1">{title}</h3>
      <p className="relative text-[12px] text-zinc-500 leading-relaxed">{desc}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [financeiro, setFinanceiro] = useState<PainelFinanceiro | null>(null);
  const [veiculos, setVeiculos] = useState<PainelVeiculo[]>([]);
  const [cotacoesAbertas, setCotacoesAbertas] = useState(0);
  const [viagensCount, setViagensCount] = useState(0);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/financeiro/painel"),
      api.get("/frota/painel"),
      api.get("/cotacoes"),
      api.get("/viagens"),
      api.get("/comissoes?pago=false"),
      api.get("/financeiro/fluxo-caixa?dias=30"),
    ])
      .then(([fin, frota, cot, viag, com, flx]) => {
        setFinanceiro(fin as PainelFinanceiro);
        setVeiculos(toList<PainelVeiculo>(frota));
        setCotacoesAbertas(toList(cot).filter((c: any) => c.status === "ABERTA").length);
        setViagensCount(toList(viag).length);
        setComissoesPendentes(toList(com).length);
        setFluxo(flx as FluxoCaixa);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const faltaMeta = financeiro
    ? Math.max(0, financeiro.metas.faturamentoMinimo - financeiro.fluxo30dias.totais.entradas)
    : 0;
  const pctMeta = financeiro?.metas.faturamentoMinimo
    ? Math.min(100, Math.round((financeiro.fluxo30dias.totais.entradas / financeiro.metas.faturamentoMinimo) * 100))
    : 0;
  const veiculosComAlerta = veiculos.filter(
    (v) => v.alertas.revisoesCriticas > 0 || v.alertas.documentosAVencer > 0 || v.alertas.segurosAVencer > 0
  ).length;

  return (
    <Shell title="Visão geral" subtitle="Bom dia — aqui está o que importa hoje">
      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
        ) : (
          <>
            <div className="bg-grid-dark bg-zinc-900 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#E63A1F]/30 blur-3xl" />
              <div className="absolute left-1/3 bottom-0 h-24 w-24 rounded-full bg-[#E63A1F]/10 blur-2xl" />
              <p className="relative text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Faltam para a meta do mês
              </p>
              <div className="relative flex items-end gap-3 flex-wrap">
                <span className="font-mono tabular-nums text-[36px] sm:text-[48px] leading-none font-bold text-white tracking-tight">
                  {fmt(faltaMeta)}
                </span>
                <span className="text-[13px] text-[#16A34A] font-semibold pb-1.5 sm:pb-2">{pctMeta}% já atingido</span>
              </div>
              <p className="relative text-[12px] text-zinc-400 mt-4">
                {cotacoesAbertas} cotações em aberto · {comissoesPendentes} comissões pendentes de pagamento
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Cotações em aberto" value={String(cotacoesAbertas)} accent="#E63A1F" />
              <StatCard
                label="Saldo a recuperar"
                value={fmt(financeiro?.saldoARecuperar ?? 0)}
                delta="pendente"
                deltaPositive={false}
                accent="#C0392B"
              />
              <StatCard
                label="Veículos com alerta"
                value={`${veiculosComAlerta}/${veiculos.length}`}
                deltaPositive={veiculosComAlerta === 0}
                delta={veiculosComAlerta > 0 ? "revisar" : "tudo em dia"}
                accent={veiculosComAlerta > 0 ? "#D97706" : "#16A34A"}
              />
              <StatCard label="Viagens registradas" value={String(viagensCount)} accent="#71717A" />
            </div>

            {financeiro && financeiro.alertas.atrasados.total > 0 && (
              <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 px-4 py-3 flex items-center justify-between">
                <p className="text-[13px] text-[#C0392B]">
                  <span className="font-semibold">{financeiro.alertas.atrasados.total} conta(s) atrasada(s)</span>
                  {" — "}{fmt(financeiro.alertas.atrasados.valor)} em aberto
                </p>
                <a href="/financeiro/lancamentos" className="text-[12px] font-medium text-[#C0392B] hover:underline whitespace-nowrap">
                  Ver lançamentos
                </a>
              </div>
            )}

            <GraficoFluxoCaixa pontos={fluxo?.curva ?? []} />

            <div>
              <h2 className="text-[13px] font-bold text-zinc-900 mb-3 tracking-tight">Módulos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ModuleCard
                  href="/cotacao"
                  icon="◆"
                  title="Cotação"
                  desc="Calcule margem e gere OS em segundos"
                  metric={`${cotacoesAbertas} ABERTAS`}
                />
                <ModuleCard
                  href="/frota"
                  icon="▤"
                  title="Frota"
                  desc="Veículos, manutenção, diesel e pneus"
                  metric={`${veiculos.length} VEÍCULOS`}
                />
                <ModuleCard
                  href="/financeiro"
                  icon="▥"
                  title="Financeiro"
                  desc="Fluxo de caixa, DRE e metas"
                  metric={`${fmt(financeiro?.metas.faturamentoMinimo ?? 0)} META`}
                />
                <ModuleCard
                  href="/jornada"
                  icon="▧"
                  title="Jornada"
                  desc="Viagens, motoristas e comissões"
                  metric={`${viagensCount} VIAGENS`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}