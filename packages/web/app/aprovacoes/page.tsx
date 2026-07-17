"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Aprovações (fluxo do gestor)
// Cole em: packages/web/app/aprovacoes/page.tsx
// ============================================================

type CotacaoPendente = {
  id: string;
  numero: number;
  origem: string;
  destino: string;
  margemPct: number;
  valorFinal: number;
  criadoEm: string;
  deficitRegistrado?: number | null;
  justificativaDeficit?: string | null;
  cliente: { nome: string };
  veiculo: { placa: string };
  criadoPor: { nome: string };
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-white placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

export default function AprovacoesPage() {
  const [pendentes, setPendentes] = useState<CotacaoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  async function carregar() {
    setLoading(true);
    try {
      const data = toList<CotacaoPendente>(await api.get("/cotacoes/pendentes-aprovacao"));
      setPendentes(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aprovar(id: string) {
    const motivo = motivos[id]?.trim();
    if (!motivo) {
      setErro("Informe o motivo da aprovação antes de confirmar.");
      return;
    }
    setAprovando(id);
    setErro(null);
    try {
      await api.post(`/cotacoes/${id}/aprovar`, { motivo });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAprovando(null);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Shell title="Aprovações pendentes" subtitle={`${pendentes.length} cotações aguardando decisão do gestor`}>
      <div className="space-y-4">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {loading && <div className="text-center text-zinc-400 dark:text-zinc-500 text-[13px] py-8">Carregando...</div>}

        {!loading && pendentes.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
            Nenhuma cotação pendente de aprovação no momento
          </div>
        )}

        {pendentes.map((c) => (
          <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#C0392B]/20 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold text-zinc-900 dark:text-white">
                  Cotação #{c.numero} · {c.cliente.nome}
                </p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                  {c.origem} → {c.destino} · {c.veiculo.placa} · criado por {c.criadoPor.nome}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#C0392B]/10 text-[#C0392B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
                Margem {c.margemPct}%
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <span className="text-[12px] text-zinc-500 dark:text-zinc-400">Valor da cotação</span>
              <span className="font-mono tabular-nums text-[16px] font-semibold text-zinc-900 dark:text-white">
                {fmt(c.valorFinal)}
              </span>
            </div>

            {(c.deficitRegistrado || c.justificativaDeficit) && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 mb-4">
                {c.deficitRegistrado != null && (
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-300 mb-1">
                    Déficit registrado: <span className="font-mono font-medium text-[#C0392B]">{fmt(c.deficitRegistrado)}</span>
                  </p>
                )}
                {c.justificativaDeficit && (
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Justificativa do atendimento:</span> &ldquo;{c.justificativaDeficit}&rdquo;
                  </p>
                )}
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Motivo da aprovação (obrigatório, fica registrado na auditoria)
                </span>
                <input
                  className={inputCls}
                  value={motivos[c.id] ?? ""}
                  onChange={(e) => setMotivos((m) => ({ ...m, [c.id]: e.target.value }))}
                  placeholder="Ex: cliente recorrente, estratégia comercial para fidelizar"
                />
              </div>
              <button
                onClick={() => aprovar(c.id)}
                disabled={aprovando === c.id}
                className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {aprovando === c.id ? "Aprovando..." : "Aprovar e gerar OS"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}