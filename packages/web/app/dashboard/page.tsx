"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function StatCard({ label, value, delta, deltaPositive = true }: { label: string; value: string; delta?: string; deltaPositive?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <p className="text-[12px] font-medium text-zinc-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-semibold text-zinc-900 tracking-tight leading-none font-mono tabular-nums">
          {value}
        </span>
        {delta && (
          <span className={`text-[12px] font-medium ${deltaPositive ? "text-[#16A34A]" : "text-[#C0392B]"}`}>
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
      className="group bg-white rounded-2xl border border-zinc-200 p-5 hover:border-[#1E4C8C]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-[#1E4C8C]/8 flex items-center justify-center text-[#1E4C8C] text-[15px]">
          {icon}
        </div>
        <span className="text-[11px] font-mono tabular-nums text-zinc-400 group-hover:text-[#1E4C8C] transition-colors">
          {metric}
        </span>
      </div>
      <h3 className="text-[14px] font-semibold text-zinc-900 mb-1">{title}</h3>
      <p className="text-[12px] text-zinc-500 leading-relaxed">{desc}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [financeiro, setFinanceiro] = useState<PainelFinanceiro | null>(null);
  const [veiculos, setVeiculos] = useState<PainelVeiculo[]>([]);
  const [cotacoesAbertas, setCotacoesAbertas] = useState(0);
  const [viagensCount, setViagensCount] = useState(0);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/financeiro/painel"),
      api.get("/frota/painel"),
      api.get("/cotacoes"),
      api.get("/viagens"),
      api.get("/comissoes?pago=false"),
    ])
      .then(([fin, frota, cot, viag, com]) => {
        setFinanceiro(fin as PainelFinanceiro);
        setVeiculos(toList<PainelVeiculo>(frota));
        setCotacoesAbertas(toList(cot).filter((c: any) => c.status === "ABERTA").length);
        setViagensCount(toList(viag).length);
        setComissoesPendentes(toList(com).length);
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
            <div className="bg-zinc-900 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1E4C8C]/25 blur-2xl" />
              <p className="text-[12px] font-medium text-zinc-400 mb-1">Faltam para a meta do mês</p>
              <div className="flex items-end gap-3">
                <span className="font-mono tabular-nums text-[42px] leading-none font-semibold text-white tracking-tight">
                  {fmt(faltaMeta)}
                </span>
                <span className="text-[13px] text-[#16A34A] font-medium pb-1.5">{pctMeta}% já atingido</span>
              </div>
              <p className="text-[12px] text-zinc-400 mt-3">
                {cotacoesAbertas} cotações em aberto · {comissoesPendentes} comissões pendentes de pagamento
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Cotações em aberto" value={String(cotacoesAbertas)} />
              <StatCard
                label="Saldo a recuperar"
                value={fmt(financeiro?.saldoARecuperar ?? 0)}
                delta="pendente"
                deltaPositive={false}
              />
              <StatCard
                label="Veículos com alerta"
                value={`${veiculosComAlerta}/${veiculos.length}`}
                deltaPositive={veiculosComAlerta === 0}
                delta={veiculosComAlerta > 0 ? "revisar" : "tudo em dia"}
              />
              <StatCard label="Viagens registradas" value={String(viagensCount)} />
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

            <div>
              <h2 className="text-[12px] font-semibold text-zinc-500 mb-3 uppercase tracking-wide">Módulos</h2>
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