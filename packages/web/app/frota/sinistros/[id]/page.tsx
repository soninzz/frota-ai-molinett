"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Detalhe do Sinistro (timeline + eventos)
// ============================================================

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

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

type Evento = { id: string; descricao: string; criadoEm: string };

type SinistroDetalhe = {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  dataOcorrencia: string;
  local?: string | null;
  descricao: string;
  boletimUrl?: string | null;
  protocolo?: string | null;
  franquiaValor?: number | null;
  valorOrcado?: number | null;
  valorIndenizado?: number | null;
  terceiroEnvolvido: boolean;
  terceiroDados?: string | null;
  observacao?: string | null;
  veiculo: { placa: string; modelo: string; marca: string };
  motorista?: { usuario: { nome: string } } | null;
  seguro?: {
    seguradora: string;
    apolice?: string | null;
    franquia?: number | null;
    responsavelAcionamento?: string | null;
    contatoResponsavel?: string | null;
  } | null;
  eventos: Evento[];
};

export default function DetalheSinistroPage() {
  const params = useParams();
  const sinistroId = params?.id as string;

  const [sinistro, setSinistro] = useState<SinistroDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novoEvento, setNovoEvento] = useState("");
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [valorOrcado, setValorOrcado] = useState("");
  const [valorIndenizado, setValorIndenizado] = useState("");
  const [salvandoValores, setSalvandoValores] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const data = await api.get<SinistroDetalhe>(`/sinistros/${sinistroId}`);
      setSinistro(data);
      setProtocolo(data.protocolo ?? "");
      setValorOrcado(data.valorOrcado != null ? String(data.valorOrcado) : "");
      setValorIndenizado(data.valorIndenizado != null ? String(data.valorIndenizado) : "");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sinistroId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinistroId]);

  async function adicionarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!novoEvento.trim()) return;
    setSalvandoEvento(true);
    setErro(null);
    try {
      await api.post(`/sinistros/${sinistroId}/eventos`, { descricao: novoEvento });
      setNovoEvento("");
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoEvento(false);
    }
  }

  async function salvarValores(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoValores(true);
    setErro(null);
    try {
      await api.patch(`/sinistros/${sinistroId}`, {
        protocolo: protocolo || undefined,
        valorOrcado: valorOrcado ? Number(valorOrcado) : undefined,
        valorIndenizado: valorIndenizado ? Number(valorIndenizado) : undefined,
      });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoValores(false);
    }
  }

  const fmt = (v?: number | null) =>
    v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  if (loading) {
    return (
      <Shell title="Sinistro" subtitle="Carregando...">
        <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
      </Shell>
    );
  }

  if (!sinistro) {
    return (
      <Shell title="Sinistro" subtitle="Não encontrado">
        <div className="text-center text-zinc-400 text-[13px] py-8">Sinistro não encontrado</div>
      </Shell>
    );
  }

  const st = STATUS[sinistro.status] ?? { label: sinistro.status, cor: "#71717A" };

  return (
    <Shell
      title={`Sinistro #${sinistro.numero}`}
      subtitle={`${sinistro.veiculo.placa} — ${sinistro.veiculo.marca} ${sinistro.veiculo.modelo}`}
    >
      <div className="max-w-3xl space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Ocorrência</h2>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: st.cor + "1A", color: st.cor }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.cor }} />
              {st.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="text-[11px] text-zinc-500">Tipo</p>
              <p className="text-zinc-900">{TIPOS[sinistro.tipo] ?? sinistro.tipo}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Data da ocorrência</p>
              <p className="font-mono tabular-nums text-zinc-900">
                {new Date(sinistro.dataOcorrencia).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Local</p>
              <p className="text-zinc-900">{sinistro.local || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Motorista</p>
              <p className="text-zinc-900">{sinistro.motorista?.usuario.nome || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-zinc-500">Descrição</p>
              <p className="text-zinc-900">{sinistro.descricao}</p>
            </div>
            {sinistro.terceiroEnvolvido && (
              <div className="col-span-2">
                <p className="text-[11px] text-zinc-500">Terceiro envolvido</p>
                <p className="text-zinc-900">{sinistro.terceiroDados || "Sim, sem dados registrados"}</p>
              </div>
            )}
          </div>
        </div>

        {sinistro.seguro && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">Seguradora</h2>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] text-zinc-500">Seguradora / Apólice</p>
                <p className="text-zinc-900">
                  {sinistro.seguro.seguradora} {sinistro.seguro.apolice ? `· ${sinistro.seguro.apolice}` : ""}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Franquia</p>
                <p className="font-mono tabular-nums text-zinc-900">{fmt(sinistro.seguro.franquia)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-zinc-500">Responsável pelo acionamento</p>
                <p className="text-zinc-900">
                  {sinistro.seguro.responsavelAcionamento || "—"}
                  {sinistro.seguro.contatoResponsavel ? ` · ${sinistro.seguro.contatoResponsavel}` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={salvarValores} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-zinc-900">Valores e protocolo</h2>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">Protocolo</span>
              <input className={inputCls} value={protocolo} onChange={(e) => setProtocolo(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">Valor orçado (R$)</span>
              <input type="number" step="0.01" className={inputCls + " font-mono tabular-nums"} value={valorOrcado} onChange={(e) => setValorOrcado(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">Valor indenizado (R$)</span>
              <input type="number" step="0.01" className={inputCls + " font-mono tabular-nums"} value={valorIndenizado} onChange={(e) => setValorIndenizado(e.target.value)} />
            </label>
          </div>
          <button
            type="submit"
            disabled={salvandoValores}
            className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
          >
            {salvandoValores ? "Salvando..." : "Salvar"}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">Timeline</h2>
          <ul className="space-y-3 mb-4">
            {sinistro.eventos.map((e) => (
              <li key={e.id} className="flex gap-3 text-[13px]">
                <span className="font-mono tabular-nums text-[11px] text-zinc-400 shrink-0 w-32">
                  {new Date(e.criadoEm).toLocaleString("pt-BR")}
                </span>
                <span className="text-zinc-700">{e.descricao}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={adicionarEvento} className="flex items-end gap-3 pt-3 border-t border-zinc-100">
            <div className="flex-1">
              <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">Novo evento</span>
              <input
                className={inputCls}
                placeholder="Ex: orçamento enviado à seguradora"
                value={novoEvento}
                onChange={(e) => setNovoEvento(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={salvandoEvento || !novoEvento.trim()}
              className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
            >
              {salvandoEvento ? "Salvando..." : "Adicionar"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
