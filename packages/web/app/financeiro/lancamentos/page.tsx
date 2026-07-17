"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, downloadFile } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Lançamentos Financeiros
// Cole em: packages/web/app/financeiro/lancamentos/page.tsx
// ============================================================

type ContaBancaria = { id: string; banco: string; conta: string };

type Lancamento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  formaPagamento?: string | null;
};

const PODE_DAR_BAIXA = new Set(["PENDENTE", "ATRASADO"]);

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
  PENDENTE: "#71717A",
  PAGO: "#16A34A",
  ATRASADO: "#C0392B",
  CANCELADO: "#71717A",
};

const TIPO_LABEL: Record<string, string> = {
  R: "Receber",
  D: "Despesa",
  E: "Empréstimo",
  M: "Multa",
  DP: "Despesa paga",
};

export default function LancamentosPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const [tipo, setTipo] = useState("D");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [vencimento, setVencimento] = useState("");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("PIX");

  async function carregar() {
    setLoading(true);
    try {
      const data = toList<Lancamento>(await api.get("/financeiro/lancamentos"));
      setLancamentos(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // contas bancárias — se não houver endpoint dedicado, ajuste depois;
    // aqui tentamos buscar do painel financeiro como fallback silencioso
    api
      .get<{ contasBancarias?: ContaBancaria[] }>("/financeiro/painel")
      .then((p) => {
        if (p.contasBancarias) {
          setContas(p.contasBancarias);
          if (p.contasBancarias.length) setContaBancariaId(p.contasBancarias[0].id);
        }
      })
      .catch(() => {});
  }, []);

  async function darBaixa(id: string) {
    try {
      await api.patch("/financeiro/lancamentos/baixar", {
        lancamentoId: id,
        pagoEm: new Date().toISOString(),
      });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function exportarCsv() {
    setExportando(true);
    try {
      await downloadFile("/financeiro/lancamentos/exportar", "lancamentos.csv");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setExportando(false);
    }
  }

  async function reagendar(id: string) {
    try {
      await api.patch(`/financeiro/lancamentos/${id}/reagendar`);
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
      await api.post("/financeiro/lancamentos", {
        tipo,
        descricao,
        valor: Number(valor),
        vencimento,
        contaBancariaId: contaBancariaId || undefined,
        formaPagamento,
      });
      setDescricao("");
      setValor("");
      setVencimento("");
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Shell title="Lançamentos" subtitle={`${lancamentos.length} lançamentos financeiros`}>
      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          <button
            onClick={exportarCsv}
            disabled={exportando}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[13px] font-medium px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar CSV"}
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo lançamento"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Novo lançamento</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls + " appearance-none"} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="R">Receber</option>
                  <option value="D">Despesa</option>
                  <option value="E">Empréstimo</option>
                  <option value="M">Multa</option>
                  <option value="DP">Despesa paga</option>
                </select>
              </Field>
              <Field label="Forma de pagamento">
                <select
                  className={inputCls + " appearance-none"}
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">PIX</option>
                  <option value="DEBITO_AUTOMATICO">Débito automático</option>
                  <option value="CARTAO_CREDITO">Cartão de crédito</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </Field>
            </div>

            <Field label="Descrição">
              <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " font-mono tabular-nums"}
                  value={valor}
                  onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Vencimento">
                <input
                  type="date"
                  className={inputCls + " font-mono"}
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  required
                />
              </Field>
            </div>

            {contas.length > 0 && (
              <Field label="Conta bancária">
                <select
                  className={inputCls + " appearance-none"}
                  value={contaBancariaId}
                  onChange={(e) => setContaBancariaId(e.target.value)}
                >
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.banco} — {c.conta}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar lançamento"}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Descrição</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Vencimento</th>
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
              {!loading && lancamentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhum lançamento
                  </td>
                </tr>
              )}
              {lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50 transition-colors">
                  <td className="px-5 py-3.5 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{l.descricao}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    {new Date(l.vencimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLOR[l.status] ?? "#71717A"}1A`,
                        color: STATUS_COLOR[l.status] ?? "#71717A",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[l.status] ?? "#71717A" }}
                      />
                      {l.status}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3.5 text-right font-mono tabular-nums font-medium ${
                      l.tipo === "R" ? "text-[#16A34A]" : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {l.tipo === "R" ? "+" : ""}
                    {fmt(l.valor)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {PODE_DAR_BAIXA.has(l.status) && (
                      <div className="flex items-center justify-end gap-3">
                        {l.status === "ATRASADO" && (
                          <button onClick={() => reagendar(l.id)} className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300">
                            Reagendar
                          </button>
                        )}
                        <button onClick={() => darBaixa(l.id)} className="text-[12px] font-medium text-[#E63A1F] hover:underline">
                          Dar baixa
                        </button>
                      </div>
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