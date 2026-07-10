"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Diesel / Abastecimento
// Cole em: packages/web/app/diesel/page.tsx
// ============================================================

type Abastecimento = {
  id: string;
  kmHodometro: number;
  volumeLitros: number;
  valorTotal: number;
  precoPorLitro: number;
  postoNome?: string | null;
  timestamp: string;
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function DieselPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [kmHodometro, setKmHodometro] = useState<number | "">("");
  const [volumeLitros, setVolumeLitros] = useState<number | "">("");
  const [valorTotal, setValorTotal] = useState<number | "">("");
  const [postoNome, setPostoNome] = useState("");

  async function carregarVeiculos() {
    const vs = toList<Veiculo>(await api.get("/frota/veiculos"));
    setVeiculos(vs);
    if (vs.length && !veiculoId) setVeiculoId(vs[0].id);
  }

  async function carregarAbastecimentos(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const data = toList<Abastecimento>(await api.get(`/diesel/abastecimentos/${id}`));
      setAbastecimentos(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarVeiculos();
  }, []);

  useEffect(() => {
    if (veiculoId) carregarAbastecimentos(veiculoId);
  }, [veiculoId]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      const precoPorLitro =
        volumeLitros && valorTotal ? Number(valorTotal) / Number(volumeLitros) : 0;
      await api.post("/diesel/abastecimentos", {
        veiculoId,
        kmHodometro: Number(kmHodometro),
        volumeLitros: Number(volumeLitros),
        valorTotal: Number(valorTotal),
        precoPorLitro,
        postoNome: postoNome || undefined,
      });
      setKmHodometro("");
      setVolumeLitros("");
      setValorTotal("");
      setPostoNome("");
      setShowForm(false);
      carregarAbastecimentos(veiculoId);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Shell title="Diesel" subtitle="Registro de abastecimentos por veículo">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="w-64">
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
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Registrar abastecimento"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Novo abastecimento</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="KM do hodômetro">
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={kmHodometro}
                  onChange={(e) => setKmHodometro(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Posto (opcional)">
                <input className={inputCls} value={postoNome} onChange={(e) => setPostoNome(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Volume (litros)">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " font-mono tabular-nums"}
                  value={volumeLitros}
                  onChange={(e) => setVolumeLitros(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Valor total (R$)">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " font-mono tabular-nums"}
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Registrar"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">KM</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Litros</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">R$/L</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Posto</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && abastecimentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum abastecimento registrado para esse veículo
                  </td>
                </tr>
              )}
              {abastecimentos.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">
                    {new Date(a.timestamp).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900">{a.kmHodometro}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600">{a.volumeLitros}L</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600">
                    {fmt(a.precoPorLitro)}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500">{a.postoNome || "—"}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums font-medium text-zinc-900">
                    {fmt(a.valorTotal)}
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