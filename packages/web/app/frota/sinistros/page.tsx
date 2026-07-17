"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Sinistros / Seguradoras
// ============================================================

const inputCls =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-white placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

const TIPOS: Record<string, string> = {
  COLISAO: "Colisão",
  ROUBO_FURTO: "Roubo / Furto",
  INCENDIO: "Incêndio",
  DANOS_TERCEIROS: "Danos a terceiros",
  PANE: "Pane",
  OUTRO: "Outro",
};

const STATUS: Record<string, { label: string; cor: string }> = {
  ABERTO: { label: "Aberto", cor: "#C0392B" },
  ACIONADO: { label: "Seguradora acionada", cor: "#D97706" },
  EM_ANALISE: { label: "Em análise", cor: "#D97706" },
  APROVADO: { label: "Aprovado", cor: "#16A34A" },
  RECUSADO: { label: "Recusado", cor: "#C0392B" },
  ENCERRADO: { label: "Encerrado", cor: "#71717A" },
};

type Sinistro = {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  dataOcorrencia: string;
  local?: string | null;
  descricao: string;
  protocolo?: string | null;
  franquiaValor?: number | null;
  valorOrcado?: number | null;
  valorIndenizado?: number | null;
  veiculo: { placa: string; modelo: string; marca: string };
  motorista?: { usuario: { nome: string } } | null;
  seguro?: { seguradora: string; apolice?: string | null } | null;
};

type Resumo = {
  total: number;
  porStatus: Record<string, number>;
  valorOrcadoTotal: number;
  valorIndenizadoTotal: number;
  franquiasTotal: number;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function SinistrosPage() {
  const [sinistros, setSinistros] = useState<Sinistro[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");

  const [veiculoId, setVeiculoId] = useState("");
  const [tipo, setTipo] = useState("COLISAO");
  const [dataOcorrencia, setDataOcorrencia] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorOrcado, setValorOrcado] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const [lista, res] = await Promise.all([
        api.get(`/sinistros${filtroStatus ? `?status=${filtroStatus}` : ""}`),
        api.get<Resumo>("/sinistros/resumo"),
      ]);
      setSinistros(toList<Sinistro>(lista));
      setResumo(res);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus]);

  useEffect(() => {
    api.get("/frota/veiculos").then((res) => setVeiculos(toList<Veiculo>(res))).catch(() => {});
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      await api.post("/sinistros", {
        veiculoId,
        tipo,
        dataOcorrencia,
        local: local || undefined,
        descricao,
        valorOrcado: valorOrcado ? Number(valorOrcado) : undefined,
      });
      setVeiculoId("");
      setTipo("COLISAO");
      setDataOcorrencia("");
      setLocal("");
      setDescricao("");
      setValorOrcado("");
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function mudarStatus(id: string, status: string) {
    try {
      await api.patch(`/sinistros/${id}`, { status });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const fmt = (v?: number | null) =>
    v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  return (
    <Shell title="Sinistros" subtitle="Ocorrências, acionamento de seguradoras e indenizações">
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {resumo && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E63A1F]" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Total de sinistros</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">{resumo.total}</span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C0392B]" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Em aberto</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-[#C0392B]">
                {(resumo.porStatus.ABERTO ?? 0) + (resumo.porStatus.ACIONADO ?? 0) + (resumo.porStatus.EM_ANALISE ?? 0)}
              </span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-400" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Franquias a desembolsar</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">
                {fmt(resumo.franquiasTotal)}
              </span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-400" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Valor orçado</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">
                {fmt(resumo.valorOrcadoTotal)}
              </span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#16A34A]" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Indenizações recebidas</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-[#16A34A]">
                {fmt(resumo.valorIndenizadoTotal)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <select className={inputCls + " max-w-[220px]"} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo sinistro"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={salvar} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Registrar sinistro</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Veículo">
                <select className={inputCls} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo">
                <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {Object.entries(TIPOS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data da ocorrência">
                <input type="datetime-local" className={inputCls} value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} required />
              </Field>
              <Field label="Local">
                <input className={inputCls} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Cidade / rodovia / km" />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea className={inputCls} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor orçado (R$)">
                <input type="number" step="0.01" className={inputCls + " font-mono tabular-nums"} value={valorOrcado} onChange={(e) => setValorOrcado(e.target.value)} />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Registrar sinistro"}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Nº</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Veículo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Orçado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Indenizado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">Carregando...</td>
                </tr>
              )}
              {!loading && sinistros.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">Nenhum sinistro registrado</td>
                </tr>
              )}
              {sinistros.map((s) => {
                const st = STATUS[s.status] ?? { label: s.status, cor: "#71717A" };
                return (
                  <tr key={s.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/60/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      <a href={`/frota/sinistros/${s.id}`} className="hover:text-[#E63A1F] hover:underline">
                        #{s.numero}
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-white">{s.veiculo.placa}</span>
                      <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">{s.veiculo.marca} — {s.veiculo.modelo}</span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{TIPOS[s.tipo] ?? s.tipo}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      {new Date(s.dataOcorrencia).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900 dark:text-white">{fmt(s.valorOrcado)}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900 dark:text-white">{fmt(s.valorIndenizado)}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={s.status}
                        onChange={(e) => mudarStatus(s.id, e.target.value)}
                        className="rounded-full text-[11px] font-medium px-2.5 py-1 border-0 outline-none cursor-pointer"
                        style={{ backgroundColor: st.cor + "1A", color: st.cor }}
                      >
                        {Object.entries(STATUS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
