"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Detalhe do Veículo
// Revisões por item, análise preditiva, pneus, seguros, documentos
// ============================================================

const inputCls =
  "rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

type VeiculoDetalhe = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  custoKmAtual?: number | null;
  custoHoraAtual?: number | null;
  itensRevisao: { id: string; nome: string; kmProximo: number | null; dataProxima: string | null }[];
  pneus: { id: string; codigo: string; posicaoAtual: string | null }[];
  seguros: { id: string; seguradora: string; vencimento: string; franquia: number | null }[];
  documentosVeiculo: { id: string; tipo: string; vencimento: string; pago: boolean }[];
};

type Revisao = {
  id: string;
  nome: string;
  kmProximo: number | null;
  dataProxima: string | null;
  status: "ok" | "proximo" | "vencido";
};

type AlertaPreditivo = { subsistema: string; quantidade: number; alerta: string };
type Preditiva = { veiculoId: string; alertas: AlertaPreditivo[]; analisadoEm: string };

const STATUS_REVISAO: Record<string, { label: string; cor: string }> = {
  ok: { label: "Em dia", cor: "#16A34A" },
  proximo: { label: "Próximo", cor: "#D97706" },
  vencido: { label: "Vencido", cor: "#C0392B" },
};

export default function DetalheVeiculoPage() {
  const params = useParams();
  const veiculoId = params?.id as string;

  const [veiculo, setVeiculo] = useState<VeiculoDetalhe | null>(null);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [preditiva, setPreditiva] = useState<Preditiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [trocandoItem, setTrocandoItem] = useState<Revisao | null>(null);
  const [kmAtual, setKmAtual] = useState<number | "">("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [v, r, p] = await Promise.all([
        api.get<VeiculoDetalhe>(`/frota/veiculos/${veiculoId}`),
        api.get(`/manutencao/veiculos/${veiculoId}/revisoes`),
        api.get<Preditiva>(`/manutencao/veiculos/${veiculoId}/preditiva`),
      ]);
      setVeiculo(v);
      setRevisoes(toList<Revisao>(r));
      setPreditiva(p);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (veiculoId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculoId]);

  async function registrarTroca(e: React.FormEvent) {
    e.preventDefault();
    if (!trocandoItem || kmAtual === "") return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post(`/manutencao/revisoes/${trocandoItem.id}/trocar`, {
        kmAtual: Number(kmAtual),
        fornecedor: fornecedor || undefined,
        valor: valor === "" ? undefined : Number(valor),
      });
      setTrocandoItem(null);
      setKmAtual("");
      setFornecedor("");
      setValor("");
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <Shell title="Veículo" subtitle="Carregando...">
        <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
      </Shell>
    );
  }

  if (!veiculo) {
    return (
      <Shell title="Veículo" subtitle="Não encontrado">
        <div className="text-center text-zinc-400 text-[13px] py-8">Veículo não encontrado</div>
      </Shell>
    );
  }

  return (
    <Shell title={veiculo.placa} subtitle={`${veiculo.marca} ${veiculo.modelo} · ${veiculo.ano}`}>
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-1">Custo/km atual</p>
            <span className="font-mono tabular-nums text-[22px] font-semibold text-zinc-900">
              {veiculo.custoKmAtual ? fmt(veiculo.custoKmAtual) : "—"}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-1">Custo/hora atual</p>
            <span className="font-mono tabular-nums text-[22px] font-semibold text-zinc-900">
              {veiculo.custoHoraAtual ? fmt(veiculo.custoHoraAtual) : "—"}
            </span>
          </div>
        </div>

        {preditiva && preditiva.alertas.length > 0 && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 px-4 py-3 space-y-1.5">
            <p className="text-[13px] font-semibold text-[#C0392B]">Análise preditiva — concentração de falhas</p>
            {preditiva.alertas.map((a) => (
              <p key={a.subsistema} className="text-[12px] text-zinc-600">{a.alerta}</p>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-[13px] font-semibold text-zinc-900">Revisões por item</h2>
          </div>
          {trocandoItem && (
            <form onSubmit={registrarTroca} className="px-5 py-4 bg-zinc-50 border-b border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-zinc-900">
                  Registrar troca — {trocandoItem.nome}
                </p>
                <button type="button" onClick={() => setTrocandoItem(null)} className="text-[12px] text-zinc-400 hover:text-zinc-600">
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-[11px] font-medium text-zinc-500 mb-1">KM atual</span>
                  <input type="number" className={inputCls + " w-full font-mono tabular-nums"} value={kmAtual} onChange={(e) => setKmAtual(e.target.value === "" ? "" : Number(e.target.value))} required />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-medium text-zinc-500 mb-1">Fornecedor</span>
                  <input className={inputCls + " w-full"} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-medium text-zinc-500 mb-1">Valor (R$)</span>
                  <input type="number" step="0.01" className={inputCls + " w-full font-mono tabular-nums"} value={valor} onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
              </div>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Confirmar troca"}
              </button>
            </form>
          )}
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Item</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Próximo KM</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Próxima data</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {revisoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum item de revisão cadastrado
                  </td>
                </tr>
              )}
              {revisoes.map((r) => {
                const st = STATUS_REVISAO[r.status];
                return (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3.5 text-zinc-900">{r.nome}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">{r.kmProximo ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-500">
                      {r.dataProxima ? new Date(r.dataProxima).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: st.cor + "1A", color: st.cor }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.cor }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setTrocandoItem(r)} className="text-[12px] font-medium text-[#1E4C8C] hover:underline">
                        Registrar troca
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-[13px] font-semibold text-zinc-900">Pneus ({veiculo.pneus.length})</h2>
            </div>
            <ul className="divide-y divide-zinc-50">
              {veiculo.pneus.length === 0 && <li className="px-5 py-4 text-[13px] text-zinc-400">Nenhum pneu cadastrado</li>}
              {veiculo.pneus.map((p) => (
                <li key={p.id} className="px-5 py-3 text-[13px] flex justify-between">
                  <span className="font-mono font-semibold text-zinc-900">{p.codigo}</span>
                  <span className="text-zinc-500 text-[12px]">{p.posicaoAtual?.replace(/_/g, " ") || "—"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-[13px] font-semibold text-zinc-900">Seguros</h2>
            </div>
            <ul className="divide-y divide-zinc-50">
              {veiculo.seguros.length === 0 && <li className="px-5 py-4 text-[13px] text-zinc-400">Nenhum seguro cadastrado</li>}
              {veiculo.seguros.map((s) => (
                <li key={s.id} className="px-5 py-3 text-[13px] flex justify-between">
                  <span className="text-zinc-900">{s.seguradora}</span>
                  <span className="font-mono tabular-nums text-zinc-500 text-[12px]">
                    {new Date(s.vencimento).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-[13px] font-semibold text-zinc-900">Documentos</h2>
          </div>
          <ul className="divide-y divide-zinc-50">
            {veiculo.documentosVeiculo.length === 0 && <li className="px-5 py-4 text-[13px] text-zinc-400">Nenhum documento cadastrado</li>}
            {veiculo.documentosVeiculo.map((d) => (
              <li key={d.id} className="px-5 py-3 text-[13px] flex justify-between items-center">
                <span className="text-zinc-900">{d.tipo}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-zinc-500 text-[12px]">
                    {new Date(d.vencimento).toLocaleDateString("pt-BR")}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: d.pago ? "#16A34A1A" : "#C0392B1A", color: d.pago ? "#16A34A" : "#C0392B" }}
                  >
                    {d.pago ? "Pago" : "Pendente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}
