"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Manutenção
// Cole em: packages/web/app/manutencao/page.tsx
// ============================================================

type OsManutencao = {
  id: string;
  numero: number;
  status: string;
  prioridade: string;
  descricao: string;
  subsistema?: string | null;
  valorEstimado?: number | null;
  veiculo: { placa: string };
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-white placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const STATUS_COLOR: Record<string, string> = {
  SOLICITADO: "#71717A",
  EM_ABERTO: "#E63A1F",
  AGUARDANDO_PECA: "#C0392B",
  AGENDADO: "#E63A1F",
  EM_EXECUCAO: "#C0392B",
  CONCLUIDO: "#16A34A",
};

const STATUS_OPCOES = ["SOLICITADO", "EM_ABERTO", "AGUARDANDO_PECA", "AGENDADO", "EM_EXECUCAO", "CONCLUIDO"];

export default function ManutencaoPage() {
  const [ordens, setOrdens] = useState<OsManutencao[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [veiculoId, setVeiculoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("BAIXA");
  const [subsistema, setSubsistema] = useState("");
  const [valorEstimado, setValorEstimado] = useState<number | "">("");

  async function carregar() {
    setLoading(true);
    try {
      const [os, vs] = await Promise.all([
        api.get("/manutencao/os"),
        api.get("/frota/veiculos"),
      ]);
      setOrdens(toList<OsManutencao>(os));
      const listaVeiculos = toList<Veiculo>(vs);
      setVeiculos(listaVeiculos);
      if (listaVeiculos.length && !veiculoId) setVeiculoId(listaVeiculos[0].id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarStatus(id: string, status: string) {
    try {
      await api.patch(`/manutencao/os/${id}/status`, { status });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      await api.post("/manutencao/os", {
        veiculoId,
        descricao,
        prioridade,
        subsistema: subsistema || undefined,
        valorEstimado: valorEstimado === "" ? undefined : Number(valorEstimado),
      });
      setDescricao("");
      setSubsistema("");
      setValorEstimado("");
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Manutenção" subtitle={`${ordens.length} ordens de serviço`}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Nova OS de manutenção"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Nova OS de manutenção</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Veículo">
                <select
                  className={inputCls + " appearance-none"}
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                >
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} — {v.modelo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridade">
                <select
                  className={inputCls + " appearance-none"}
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </Field>
            </div>
            <Field label="Descrição">
              <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subsistema (opcional)">
                <input
                  className={inputCls}
                  placeholder="motor, freios, suspensão..."
                  value={subsistema}
                  onChange={(e) => setSubsistema(e.target.value)}
                />
              </Field>
              <Field label="Valor estimado (opcional)">
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar OS"}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">OS</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Veículo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Descrição</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Prioridade</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && ordens.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhuma OS de manutenção
                  </td>
                </tr>
              )}
              {ordens.map((o) => (
                <tr key={o.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-zinc-900 dark:text-white">#{o.numero}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600 dark:text-zinc-300">{o.veiculo.placa}</td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{o.descricao}</td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-[12px]">{o.prioridade}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={o.status}
                      onChange={(e) => mudarStatus(o.id, e.target.value)}
                      className="rounded-full text-[11px] font-medium px-2.5 py-1 border-0 outline-none cursor-pointer"
                      style={{
                        backgroundColor: `${STATUS_COLOR[o.status] ?? "#71717A"}1A`,
                        color: STATUS_COLOR[o.status] ?? "#71717A",
                      }}
                    >
                      {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
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