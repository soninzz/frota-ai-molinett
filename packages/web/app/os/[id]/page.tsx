"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

type MotoristaOpcao = { id: string; usuario: { nome: string } };

// ============================================================
// FROTA AI · Molinett — Detalhe da OS (cotação + viagem + comissão)
// Cole em: packages/web/app/os/[id]/page.tsx
// ============================================================

type OsDetalhe = {
  id: string;
  numero: number;
  status: string;
  snapshot: {
    rota: { origem: string; destino: string; km?: number | null };
    valorFinal: number;
    margem: number;
    motorista?: string | null;
  };
  viagem?: {
    id: string;
    kmInicio?: number | null;
    kmFim?: number | null;
    kmRodado?: number | null;
    receitaReal?: number | null;
    custoReal?: number | null;
    margemReal?: number | null;
    positivo?: boolean | null;
    concluidaEm?: string | null;
  } | null;
  comissao?: { valor: number; percentual: number; pago: boolean } | null;
};

type Disponibilidade = {
  apto: boolean;
  motivos: string[];
  alternativos: { id: string; nome: string }[];
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

const STATUS_COLOR: Record<string, string> = {
  AGUARDANDO: "#71717A",
  EM_ANDAMENTO: "#1E4C8C",
  CONCLUIDA: "#16A34A",
  CANCELADA: "#C0392B",
};

export default function DetalheOsPage() {
  const params = useParams();
  const osId = params?.id as string;

  const [os, setOs] = useState<OsDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [kmInicio, setKmInicio] = useState<number | "">("");
  const [kmFim, setKmFim] = useState<number | "">("");
  const [processando, setProcessando] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade | null>(null);
  const [motoristas, setMotoristas] = useState<MotoristaOpcao[]>([]);
  const [motoristaEscolhido, setMotoristaEscolhido] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const data = await api.get<OsDetalhe>(`/cotacoes/os/${osId}`);
      setOs(data);
      if (data.snapshot.motorista && !data.viagem && data.status === "AGUARDANDO") {
        api
          .get<Disponibilidade>(`/jornada/lei-motorista/verificar/${data.snapshot.motorista}`)
          .then(setDisponibilidade)
          .catch(() => {});
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (osId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osId]);

  useEffect(() => {
    api.get("/motoristas").then((res) => setMotoristas(toList<MotoristaOpcao>(res))).catch(() => {});
  }, []);

  async function iniciar() {
    setProcessando(true);
    setErro(null);
    try {
      await api.post("/viagens/iniciar", {
        osId,
        kmInicio: Number(kmInicio),
        motoristaId: motoristaEscolhido || undefined,
      });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  async function finalizar() {
    if (!os?.viagem) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.post(`/viagens/${os.viagem.id}/finalizar`, { kmFim: Number(kmFim) });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <Shell title="Detalhe da OS" subtitle="Carregando...">
        <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
      </Shell>
    );
  }

  if (!os) {
    return (
      <Shell title="Detalhe da OS" subtitle="Não encontrada">
        <div className="text-center text-zinc-400 text-[13px] py-8">OS não encontrada</div>
      </Shell>
    );
  }

  return (
    <Shell title={`OS #${os.numero}`} subtitle={`${os.snapshot.rota.origem} → ${os.snapshot.rota.destino}`}>
      <div className="max-w-2xl space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Cotação</h2>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: `${STATUS_COLOR[os.status] ?? "#71717A"}1A`,
                color: STATUS_COLOR[os.status] ?? "#71717A",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[os.status] ?? "#71717A" }} />
              {os.status.replace("_", " ")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="text-[11px] text-zinc-500">Rota</p>
              <p className="text-zinc-900">
                {os.snapshot.rota.origem} → {os.snapshot.rota.destino}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Valor / Margem</p>
              <p className="font-mono tabular-nums text-zinc-900">
                {fmt(os.snapshot.valorFinal)} · {os.snapshot.margem}%
              </p>
            </div>
          </div>
        </div>

        {disponibilidade && !disponibilidade.apto && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-[#C0392B] mb-1">
              Motorista pode não estar apto pela Lei do Motorista
            </p>
            <ul className="text-[12px] text-zinc-600 list-disc pl-4 space-y-0.5">
              {disponibilidade.motivos.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            {disponibilidade.alternativos.length > 0 && (
              <p className="text-[12px] text-zinc-600 mt-2">
                Motoristas livres agora: {disponibilidade.alternativos.map((a) => a.nome).join(", ")}
              </p>
            )}
          </div>
        )}

        {!os.viagem && os.status === "AGUARDANDO" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">Iniciar viagem</h2>
            {!os.snapshot.motorista && (
              <div className="mb-4">
                <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">
                  Motorista (não foi definido na cotação)
                </span>
                <select
                  className={inputCls + " appearance-none"}
                  value={motoristaEscolhido}
                  onChange={(e) => setMotoristaEscolhido(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.usuario.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">KM do hodômetro (início)</span>
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={kmInicio}
                  onChange={(e) => setKmInicio(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <button
                onClick={iniciar}
                disabled={processando || kmInicio === "" || (!os.snapshot.motorista && !motoristaEscolhido)}
                className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
              >
                {processando ? "Iniciando..." : "Iniciar viagem"}
              </button>
            </div>
          </div>
        )}

        {os.viagem && !os.viagem.concluidaEm && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-1">Viagem em andamento</h2>
            <p className="text-[12px] text-zinc-500 mb-4">KM início: {os.viagem.kmInicio}</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">KM do hodômetro (final)</span>
                <input
                  type="number"
                  className={inputCls + " font-mono tabular-nums"}
                  value={kmFim}
                  onChange={(e) => setKmFim(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <button
                onClick={finalizar}
                disabled={processando || kmFim === ""}
                className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors disabled:opacity-50"
              >
                {processando ? "Finalizando..." : "Finalizar viagem"}
              </button>
            </div>
          </div>
        )}

        {os.viagem?.concluidaEm && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">Resultado da viagem</h2>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] text-zinc-500">KM rodado</p>
                <p className="font-mono tabular-nums text-zinc-900">{os.viagem.kmRodado} km</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Margem real</p>
                <p
                  className={`font-mono tabular-nums font-medium ${
                    os.viagem.positivo ? "text-[#16A34A]" : "text-[#C0392B]"
                  }`}
                >
                  {fmt(os.viagem.margemReal ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Receita real</p>
                <p className="font-mono tabular-nums text-zinc-900">{fmt(os.viagem.receitaReal ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Custo real</p>
                <p className="font-mono tabular-nums text-zinc-900">{fmt(os.viagem.custoReal ?? 0)}</p>
              </div>
            </div>
          </div>
        )}

        {os.comissao && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-3">Comissão do motorista</h2>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-zinc-500">{os.comissao.percentual}% sobre a receita</span>
              <span className="font-mono tabular-nums text-[18px] font-semibold text-zinc-900">
                {fmt(os.comissao.valor)}
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mt-2"
              style={{
                backgroundColor: os.comissao.pago ? "#16A34A1A" : "#C0392B1A",
                color: os.comissao.pago ? "#16A34A" : "#C0392B",
              }}
            >
              {os.comissao.pago ? "Paga" : "Pendente"}
            </span>
          </div>
        )}
      </div>
    </Shell>
  );
}