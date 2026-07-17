"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Cadastro de Clientes
// Cole em: packages/web/app/clientes/page.tsx
// ============================================================

type RegraPrazo = { tipo: "dias" | "dia_mes"; valor?: number; dia?: number };

type Cliente = {
  id: string;
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  regraPrazo?: RegraPrazo | null;
  ativo: boolean;
};

function formatarRegraPrazo(r?: RegraPrazo | null) {
  if (!r) return "—";
  if (r.tipo === "dias") return `${r.valor} dias após emissão`;
  if (r.tipo === "dia_mes") return `dia ${r.dia} do mês`;
  return "—";
}

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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [prazoTipo, setPrazoTipo] = useState<"dias" | "dia_mes">("dias");
  const [prazoValor, setPrazoValor] = useState(30);

  async function carregar() {
    setLoading(true);
    try {
      const data = toList<Cliente>(await api.get("/clientes"));
      setClientes(data);
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
      await api.post("/clientes", {
        nome,
        cnpj: cnpj || undefined,
        telefone: telefone || undefined,
        email: email || undefined,
        regraPrazo:
          prazoTipo === "dias" ? { tipo: "dias", valor: prazoValor } : { tipo: "dia_mes", dia: prazoValor },
      });
      setNome("");
      setCnpj("");
      setTelefone("");
      setEmail("");
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Clientes" subtitle={`${clientes.length} clientes cadastrados`}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo cliente"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Novo cliente</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome / Razão social">
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
              </Field>
              <Field label="CNPJ">
                <input className={inputCls + " font-mono"} value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <input className={inputCls} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Regra de prazo">
                <select
                  className={inputCls + " appearance-none"}
                  value={prazoTipo}
                  onChange={(e) => setPrazoTipo(e.target.value as "dias" | "dia_mes")}
                >
                  <option value="dias">X dias após emissão</option>
                  <option value="dia_mes">Dia fixo do mês</option>
                </select>
              </Field>
              <Field label={prazoTipo === "dias" ? "Quantidade de dias" : "Dia do mês"}>
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={prazoValor}
                  onChange={(e) => setPrazoValor(Number(e.target.value))}
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar cliente"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Nome</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">CNPJ</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Contato</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Prazo de pagamento</th>
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
              {!loading && clientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum cliente cadastrado
                  </td>
                </tr>
              )}
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-900 font-medium">{c.nome}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">{c.cnpj || "—"}</td>
                  <td className="px-5 py-3.5 text-zinc-500">
                    {c.telefone || "—"}
                    {c.email && <span className="block text-[11px] text-zinc-400">{c.email}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500">{formatarRegraPrazo(c.regraPrazo)}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: c.ativo ? "#16A34A1A" : "#C0392B1A",
                        color: c.ativo ? "#16A34A" : "#C0392B",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.ativo ? "#16A34A" : "#C0392B" }} />
                      {c.ativo ? "Ativo" : "Inativo"}
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