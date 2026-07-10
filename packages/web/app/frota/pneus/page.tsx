"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Pneus (completo: cadastro + movimentação)
// Cole em: packages/web/app/frota/pneus/page.tsx
// ============================================================

type Movimentacao = {
  id: string;
  tipo: "TROCA" | "RODIZIO" | "VIRADA";
  posicaoDe?: string | null;
  posicaoPara?: string | null;
  kmNaMomento: number;
  criadoEm: string;
};

type Pneu = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  tamanho: string;
  posicaoAtual?: string | null;
  kmAcumulados: number;
  ativo: boolean;
  movimentacoes?: Movimentacao[];
};

const TIPO_MOV_LABEL: Record<string, string> = { TROCA: "Troca", RODIZIO: "Rodízio", VIRADA: "Virada" };

const POSICOES = [
  "DIANTEIRA_DIREITA",
  "DIANTEIRA_ESQUERDA",
  "TRACAO_DIREITA_EXTERNA",
  "TRACAO_DIREITA_INTERNA",
  "TRACAO_ESQUERDA_EXTERNA",
  "TRACAO_ESQUERDA_INTERNA",
  "TRASEIRA_DIREITA_EXTERNA",
  "TRASEIRA_DIREITA_INTERNA",
  "TRASEIRA_ESQUERDA_EXTERNA",
  "TRASEIRA_ESQUERDA_INTERNA",
  "STEP_DIREITA",
  "STEP_ESQUERDA",
  "ESTEPE",
];

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

export default function PneusPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // ── Formulário: novo pneu ──
  const [showFormPneu, setShowFormPneu] = useState(false);
  const [salvandoPneu, setSalvandoPneu] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [podeVirar, setPodeVirar] = useState(true);

  // ── Formulário: movimentação ──
  const [pneuMovimentando, setPneuMovimentando] = useState<Pneu | null>(null);
  const [tipoMov, setTipoMov] = useState<"TROCA" | "RODIZIO" | "VIRADA">("RODIZIO");
  const [posicaoPara, setPosicaoPara] = useState(POSICOES[0]);
  const [kmNaMomento, setKmNaMomento] = useState<number | "">("");
  const [salvandoMov, setSalvandoMov] = useState(false);

  async function carregarVeiculos() {
    const vs = toList<Veiculo>(await api.get("/frota/veiculos"));
    setVeiculos(vs);
    if (vs.length && !veiculoId) setVeiculoId(vs[0].id);
  }

  async function carregarPneus(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const data = toList<Pneu>(await api.get(`/pneus/veiculo/${id}`));
      setPneus(data);
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
    if (veiculoId) carregarPneus(veiculoId);
  }, [veiculoId]);

  async function salvarPneu(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPneu(true);
    setErro(null);
    try {
      await api.post("/pneus", { codigo, veiculoId, marca, modelo, tamanho, podeVirar });
      setCodigo("");
      setMarca("");
      setModelo("");
      setTamanho("");
      setShowFormPneu(false);
      carregarPneus(veiculoId);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoPneu(false);
    }
  }

  async function salvarMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!pneuMovimentando) return;
    setSalvandoMov(true);
    setErro(null);
    try {
      await api.post(`/pneus/${pneuMovimentando.id}/movimentacao`, {
        tipo: tipoMov,
        veiculoId,
        posicaoPara: tipoMov !== "VIRADA" ? posicaoPara : undefined,
        kmNaMomento: kmNaMomento === "" ? undefined : Number(kmNaMomento),
      });
      setPneuMovimentando(null);
      setKmNaMomento("");
      carregarPneus(veiculoId);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoMov(false);
    }
  }

  return (
    <Shell title="Pneus" subtitle="Controle de pneus por veículo">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="w-64">
            <select className={inputCls + " appearance-none"} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.modelo}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowFormPneu((s) => !s)}
            className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors"
          >
            {showFormPneu ? "Cancelar" : "+ Novo pneu"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {showFormPneu && (
          <form onSubmit={salvarPneu} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Novo pneu</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código identificador">
                <input className={inputCls} value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
              </Field>
              <Field label="Tamanho">
                <input
                  className={inputCls}
                  placeholder="295/80 R22.5"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
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
            <label className="flex items-center gap-2 text-[13px] text-zinc-600">
              <input type="checkbox" checked={podeVirar} onChange={(e) => setPodeVirar(e.target.checked)} />
              Pneu direcional (pode virar no aro)
            </label>
            <button
              type="submit"
              disabled={salvandoPneu}
              className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
            >
              {salvandoPneu ? "Salvando..." : "Salvar pneu"}
            </button>
          </form>
        )}

        {pneuMovimentando && (
          <form onSubmit={salvarMovimentacao} className="bg-white rounded-2xl border border-[#1E4C8C]/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-900">
                Movimentar pneu <span className="font-mono">{pneuMovimentando.codigo}</span>
              </h2>
              <button type="button" onClick={() => setPneuMovimentando(null)} className="text-[12px] text-zinc-400 hover:text-zinc-600">
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de movimentação">
                <select
                  className={inputCls + " appearance-none"}
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as "TROCA" | "RODIZIO" | "VIRADA")}
                >
                  <option value="RODIZIO">Rodízio</option>
                  <option value="TROCA">Troca</option>
                  <option value="VIRADA">Virada</option>
                </select>
              </Field>
              <Field label="KM no momento">
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={kmNaMomento}
                  onChange={(e) => setKmNaMomento(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </Field>
            </div>
            {tipoMov !== "VIRADA" && (
              <Field label="Nova posição">
                <select className={inputCls + " appearance-none"} value={posicaoPara} onChange={(e) => setPosicaoPara(e.target.value)}>
                  {POSICOES.map((p) => (
                    <option key={p} value={p}>
                      {p.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button
              type="submit"
              disabled={salvandoMov}
              className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
            >
              {salvandoMov ? "Registrando..." : "Registrar movimentação"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Código</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Marca / Modelo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Tamanho</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Posição</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">KM acumulado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Ação</th>
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
              {!loading && pneus.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum pneu cadastrado para esse veículo
                  </td>
                </tr>
              )}
              {pneus.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-zinc-900">{p.codigo}</td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {p.marca} — {p.modelo}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">{p.tamanho}</td>
                  <td className="px-5 py-3.5 text-[12px] text-zinc-500">
                    {p.posicaoAtual ? p.posicaoAtual.replace(/_/g, " ") : "—"}
                    {p.movimentacoes && p.movimentacoes.length > 0 && (
                      <span className="block text-[11px] text-zinc-400 mt-0.5">
                        {p.movimentacoes.map((m) => `${TIPO_MOV_LABEL[m.tipo]} (${new Date(m.criadoEm).toLocaleDateString("pt-BR")})`).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900">{p.kmAcumulados} km</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setPneuMovimentando(p)}
                      className="text-[12px] font-medium text-[#1E4C8C] hover:underline"
                    >
                      Movimentar
                    </button>
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