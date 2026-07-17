"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Histórico de Cotações
// Cole em: packages/web/app/cotacao/historico/page.tsx
// ============================================================

type Cotacao = {
  id: string;
  numero: number;
  origem: string;
  destino: string;
  kmEstimado?: number | null;
  margemPct: number;
  valorFinal: number;
  status: string;
  criadoEm: string;
  cliente: { nome: string };
  veiculo: { placa: string };
  ordemServico?: { id: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  ABERTA: "#E63A1F",
  CONVERTIDA: "#16A34A",
  CANCELADA: "#C0392B",
};

export default function HistoricoCotacoesPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Cotacao[] | { cotacoes: Cotacao[]; total: number } | { data: Cotacao[] }>("/cotacoes")
      .then((res) => {
        let lista: Cotacao[] = [];
        if (Array.isArray(res)) lista = res;
        else if (res && "cotacoes" in res) lista = res.cotacoes;
        else if (res && "data" in res) lista = (res as { data: Cotacao[] }).data;
        setCotacoes(lista);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalConvertidas = cotacoes.filter((c) => c.status === "CONVERTIDA").length;
  const taxaFechamento = cotacoes.length ? Math.round((totalConvertidas / cotacoes.length) * 100) : 0;

  return (
    <Shell title="Histórico de Cotações" subtitle={`${cotacoes.length} cotações registradas`}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E63A1F]" />
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Total de cotações</p>
            <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">
              {cotacoes.length}
            </span>
          </div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#16A34A]" />
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Convertidas em OS</p>
            <span className="font-mono tabular-nums text-[28px] font-bold text-[#16A34A]">
              {totalConvertidas}
            </span>
          </div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-400" />
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Taxa de fechamento</p>
            <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">
              {taxaFechamento}%
            </span>
          </div>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Nº</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Rota</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Veículo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Margem</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && cotacoes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhuma cotação registrada ainda
                  </td>
                </tr>
              )}
              {cotacoes.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 transition-colors ${
                    c.ordemServico ? "hover:bg-[#E63A1F]/5 cursor-pointer" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50"
                  }`}
                  onClick={() => {
                    if (c.ordemServico) window.location.href = `/os/${c.ordemServico.id}`;
                  }}
                >
                  <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-zinc-900 dark:text-white">
                    #{c.numero}
                    {c.ordemServico && <span className="text-[#E63A1F] ml-1">→</span>}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{c.cliente.nome}</td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">
                    {c.origem} → {c.destino}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600 dark:text-zinc-300">{c.veiculo.placa}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600 dark:text-zinc-300">{c.margemPct}%</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLOR[c.status] ?? "#71717A"}1A`,
                        color: STATUS_COLOR[c.status] ?? "#71717A",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[c.status] ?? "#71717A" }}
                      />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums font-medium text-zinc-900 dark:text-white">
                    {fmt(c.valorFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}