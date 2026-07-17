"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Cadastro de Veículos
// Cole em: packages/web/app/frota/cadastro/page.tsx
// ============================================================

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function CadastroVeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState(2024);

  async function carregar() {
    setLoading(true);
    try {
      const data = toList<Veiculo>(await api.get("/frota/veiculos"));
      setVeiculos(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      await api.post("/frota/veiculos", { placa, modelo, marca, ano });
      setPlaca("");
      setModelo("");
      setMarca("");
      setAno(2024);
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Cadastro de Veículos" subtitle={`${veiculos.length} veículos na frota`}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo veículo"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Novo veículo</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Placa">
                <input
                  className={inputCls + " font-mono uppercase"}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  maxLength={7}
                  required
                />
              </Field>
              <Field label="Ano">
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} required />
              </Field>
              <Field label="Modelo">
                <input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} required />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar veículo"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Placa</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Marca / Modelo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Ano</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Custo/km</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && veiculos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum veículo cadastrado
                  </td>
                </tr>
              )}
              {veiculos.map((v) => (
                <tr key={v.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-zinc-900">
                    <a href={`/frota/veiculos/${v.id}`} className="hover:text-[#E63A1F] hover:underline">{v.placa}</a>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {v.marca} — {v.modelo}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">{v.ano}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900">
                    {v.custoKmAtual ? `R$ ${v.custoKmAtual.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: v.ativo ? "#16A34A1A" : "#C0392B1A",
                        color: v.ativo ? "#16A34A" : "#C0392B",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: v.ativo ? "#16A34A" : "#C0392B" }}
                      />
                      {v.ativo ? "Ativo" : "Inativo"}
                    </span>
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