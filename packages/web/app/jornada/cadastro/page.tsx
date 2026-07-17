"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Motorista } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Cadastro de Motoristas
// Cole em: packages/web/app/jornada/cadastro/page.tsx
// ============================================================

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

export default function CadastroMotoristasPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnh, setCnh] = useState("");
  const [cnhCategoria, setCnhCategoria] = useState("E");
  const [cnhVencimento, setCnhVencimento] = useState("");
  const [comissaoPct, setComissaoPct] = useState(10);

  async function carregar() {
    setLoading(true);
    try {
      const data = toList<Motorista>(await api.get("/motoristas"));
      setMotoristas(data);
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
    setSucesso(false);
    try {
      await api.post("/motoristas", { nome, email, cpf, cnh, cnhCategoria, cnhVencimento, comissaoPct });
      setSucesso(true);
      setNome("");
      setEmail("");
      setCpf("");
      setCnh("");
      setCnhVencimento("");
      setComissaoPct(10);
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Cadastro de Motoristas" subtitle={`${motoristas.length} motoristas ativos`}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo motorista"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="rounded-xl bg-[#16A34A]/8 border border-[#16A34A]/20 px-4 py-3">
            <p className="text-[13px] font-medium text-[#16A34A]">Motorista cadastrado com sucesso</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              O motorista interage pelo WhatsApp — não é necessário login com senha no painel.
            </p>
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Novo motorista</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo">
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF">
                <input className={inputCls + " font-mono"} value={cpf} onChange={(e) => setCpf(e.target.value)} required />
              </Field>
              <Field label="CNH (número)">
                <input className={inputCls + " font-mono"} value={cnh} onChange={(e) => setCnh(e.target.value)} required />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Categoria CNH">
                <select
                  className={inputCls + " appearance-none"}
                  value={cnhCategoria}
                  onChange={(e) => setCnhCategoria(e.target.value)}
                >
                  {["A", "B", "C", "D", "E"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vencimento CNH">
                <input
                  type="date"
                  className={inputCls + " font-mono"}
                  value={cnhVencimento}
                  onChange={(e) => setCnhVencimento(e.target.value)}
                  required
                />
              </Field>
              <Field label="Comissão (%)">
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={comissaoPct}
                  onChange={(e) => setComissaoPct(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.5}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar motorista"}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Nome</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">CPF</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">CNH</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Vencimento CNH</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Comissão</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
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
              {!loading && motoristas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhum motorista cadastrado
                  </td>
                </tr>
              )}
              {motoristas.map((m) => (
                <tr key={m.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-900 dark:text-white font-medium">{m.usuario.nome}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">{m.cpf}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    {m.cnh} ({m.cnhCategoria})
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">
                    {(() => {
                      const venceEm = new Date(m.cnhVencimento);
                      const diasRestantes = Math.ceil((venceEm.getTime() - Date.now()) / 86400000);
                      const vencida = diasRestantes < 0;
                      const proxima = diasRestantes >= 0 && diasRestantes <= 60;
                      return (
                        <span className={vencida ? "text-[#C0392B] font-medium" : proxima ? "text-[#D97706] font-medium" : "text-zinc-500 dark:text-zinc-400"}>
                          {venceEm.toLocaleDateString("pt-BR")}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900 dark:text-white">{m.comissaoPct}%</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: m.usuario.ativo ? "#16A34A1A" : "#C0392B1A",
                        color: m.usuario.ativo ? "#16A34A" : "#C0392B",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: m.usuario.ativo ? "#16A34A" : "#C0392B" }}
                      />
                      {m.usuario.ativo ? "Ativo" : "Inativo"}
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