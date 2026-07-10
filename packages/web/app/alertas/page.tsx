"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Alertas (motor de notificações)
// Cole em: packages/web/app/alertas/page.tsx
// ============================================================

type HistoricoAlerta = {
  id: string;
  destinatario: string;
  canal: string;
  payload: { mensagem: string; contexto?: Record<string, unknown> };
  entregue: boolean;
  enviadoEm: string;
  regra: { categoria: string; evento: string; descricao: string };
};

type RegraAlerta = {
  id: string;
  categoria: string;
  evento: string;
  descricao: string;
  canal: string;
  ativo: boolean;
};

const CATEGORIA_COLOR: Record<string, string> = {
  FINANCEIRO: "#16A34A",
  OPERACIONAL: "#1E4C8C",
  MANUTENCAO: "#C0392B",
  COMERCIAL: "#1E4C8C",
  COMPLIANCE: "#C0392B",
};

export default function AlertasPage() {
  const [aba, setAba] = useState<"recentes" | "regras">("recentes");
  const [alertas, setAlertas] = useState<HistoricoAlerta[]>([]);
  const [regras, setRegras] = useState<RegraAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([api.get("/alertas"), api.get("/alertas/regras")]);
      setAlertas(toList<HistoricoAlerta>(a));
      setRegras(toList<RegraAlerta>(r));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarRegra(id: string, ativoAtual: boolean) {
    setAlternando(id);
    try {
      await api.patch(`/alertas/regras/${id}`, { ativo: !ativoAtual });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAlternando(null);
    }
  }

  function tempoRelativo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  }

  return (
    <Shell title="Alertas" subtitle="Motor de notificações — hoje no painel, em breve também no WhatsApp">
      <div className="space-y-6">
        <div className="flex gap-2">
          <button
            onClick={() => setAba("recentes")}
            className={`text-[13px] font-medium px-4 py-2 rounded-full transition-colors ${
              aba === "recentes" ? "bg-[#1E4C8C] text-white" : "bg-white border border-zinc-200 text-zinc-600"
            }`}
          >
            Recentes
          </button>
          <button
            onClick={() => setAba("regras")}
            className={`text-[13px] font-medium px-4 py-2 rounded-full transition-colors ${
              aba === "regras" ? "bg-[#1E4C8C] text-white" : "bg-white border border-zinc-200 text-zinc-600"
            }`}
          >
            Regras cadastradas
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {loading && <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>}

        {!loading && aba === "recentes" && (
          <div className="space-y-2">
            {alertas.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-400 text-[13px]">
                Nenhum alerta disparado ainda
              </div>
            )}
            {alertas.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-start gap-3">
                <span
                  className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: CATEGORIA_COLOR[a.regra.categoria] ?? "#71717A" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: CATEGORIA_COLOR[a.regra.categoria] ?? "#71717A" }}
                    >
                      {a.regra.categoria}
                    </span>
                    <span className="text-[11px] text-zinc-400">{a.regra.evento}</span>
                  </div>
                  <p className="text-[13px] text-zinc-700">{a.payload.mensagem}</p>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums whitespace-nowrap">
                  {tempoRelativo(a.enviadoEm)}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && aba === "regras" && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Categoria</th>
                  <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Evento</th>
                  <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Descrição</th>
                  <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Canal</th>
                  <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Ativa</th>
                </tr>
              </thead>
              <tbody>
                {regras.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                      Nenhuma regra cadastrada ainda
                    </td>
                  </tr>
                )}
                {regras.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: CATEGORIA_COLOR[r.categoria] ?? "#71717A" }}
                      >
                        {r.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-zinc-600">{r.evento}</td>
                    <td className="px-5 py-3.5 text-zinc-700">{r.descricao}</td>
                    <td className="px-5 py-3.5 text-[12px] text-zinc-500">{r.canal}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => alternarRegra(r.id, r.ativo)}
                        disabled={alternando === r.id}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          r.ativo ? "bg-[#16A34A]" : "bg-zinc-300"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            r.ativo ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}