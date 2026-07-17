"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Comissões
// Cole em: packages/web/app/jornada/comissoes/page.tsx
// ============================================================

type Comissao = {
  id: string;
  percentual: number;
  valor: number;
  pago: boolean;
  pagoEm?: string | null;
  criadoEm: string;
  motorista: { usuario: { nome: string } };
  os: { numero: number };
};

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "pendentes">("pendentes");

  async function carregar() {
    setLoading(true);
    try {
      const query = filtro === "pendentes" ? "?pago=false" : "";
      const data = toList<Comissao>(await api.get(`/comissoes${query}`));
      setComissoes(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [filtro]);

  async function pagar(id: string) {
    setPagando(id);
    try {
      await api.patch(`/comissoes/${id}/pagar`);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setPagando(null);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalPendente = comissoes.filter((c) => !c.pago).reduce((acc, c) => acc + c.valor, 0);

  return (
    <Shell title="Comissões" subtitle={`${comissoes.length} registros`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C0392B]" />
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Total pendente de pagamento</p>
            <span className="font-mono tabular-nums text-[28px] font-bold text-[#C0392B]">
              {fmt(totalPendente)}
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Filtro</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltro("pendentes")}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                  filtro === "pendentes" ? "bg-[#E63A1F] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFiltro("todas")}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                  filtro === "todas" ? "bg-[#E63A1F] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Todas
              </button>
            </div>
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
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Motorista</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">OS</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">%</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide text-right">Valor</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && comissoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhuma comissão encontrada
                  </td>
                </tr>
              )}
              {comissoes.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-900 dark:text-white font-medium">{c.motorista.usuario.nome}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600 dark:text-zinc-300">#{c.os.numero}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">{c.percentual}%</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: c.pago ? "#16A34A1A" : "#C0392B1A",
                        color: c.pago ? "#16A34A" : "#C0392B",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.pago ? "#16A34A" : "#C0392B" }} />
                      {c.pago ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums font-medium text-zinc-900 dark:text-white">
                    {fmt(c.valor)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!c.pago && (
                      <button
                        onClick={() => pagar(c.id)}
                        disabled={pagando === c.id}
                        className="text-[12px] font-medium text-[#E63A1F] hover:underline disabled:opacity-50"
                      >
                        {pagando === c.id ? "Pagando..." : "Marcar como paga"}
                      </button>
                    )}
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