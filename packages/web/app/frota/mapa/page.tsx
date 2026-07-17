"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Mapa ao vivo (posição dos rastreadores)
// ============================================================

export type PosicaoVeiculo = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  latitude: number | null;
  longitude: number | null;
  velocidade: number | null;
  motorLigado: boolean | null;
  atualizadoEm: string | null;
  fonte: string | null;
  temPosicao: boolean;
};

// Leaflet usa `window` — só pode renderizar no cliente
const MapaVeiculos = dynamic(() => import("./MapaVeiculos"), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[13px] text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

function tempoRelativo(iso: string | null): string {
  if (!iso) return "sem dado";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export function dataHoraCompleta(iso: string | null): string {
  if (!iso) return "sem dado";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MapaFrotaPage() {
  const [veiculos, setVeiculos] = useState<PosicaoVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  async function carregar() {
    try {
      const data = await api.get<PosicaoVeiculo[]>("/rastreador/posicoes");
      setVeiculos(Array.isArray(data) ? data : []);
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, []);

  const comPosicao = veiculos.filter((v) => v.temPosicao);
  const semPosicao = veiculos.filter((v) => !v.temPosicao);

  return (
    <Shell title="Mapa ao vivo" subtitle="Última posição conhecida de cada veículo (Assemilsat + MegaSat)">
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-400 text-[13px] py-8">Carregando...</div>
        ) : comPosicao.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center text-[13px] text-zinc-400">
            Nenhum veículo com posição registrada ainda — o cron de sincronização roda a cada 5 min
            quando TRACKER_MODE=live.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <MapaVeiculos veiculos={comPosicao} selecionado={selecionado} onSelecionar={setSelecionado} />

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden max-h-[560px] overflow-y-auto">
              <div className="px-4 py-3 border-b border-zinc-100 sticky top-0 bg-white">
                <h2 className="text-[13px] font-bold text-zinc-900">Veículos ({comPosicao.length})</h2>
              </div>
              {comPosicao.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelecionado(v.id)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-50 last:border-0 transition-colors ${
                    selecionado === v.id ? "bg-[#E63A1F]/6" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-zinc-900">{v.placa}</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: v.motorLigado ? (Number(v.velocidade) > 5 ? "#16A34A" : "#D97706") : "#A1A1AA" }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {v.marca} {v.modelo}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {v.motorLigado ? (Number(v.velocidade) > 5 ? `${Math.round(Number(v.velocidade))} km/h` : "parado, motor ligado") : "motor desligado"}
                    {" · "}
                    {tempoRelativo(v.atualizadoEm)}
                    {v.fonte && ` · ${v.fonte}`}
                  </p>
                  <p className="text-[10px] text-zinc-300 mt-0.5">{dataHoraCompleta(v.atualizadoEm)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && semPosicao.length > 0 && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-[12px] text-zinc-500">
            <span className="font-medium text-zinc-700">{semPosicao.length} veículo(s) sem posição ainda:</span>{" "}
            {semPosicao.map((v) => v.placa).join(", ")}
          </div>
        )}
      </div>
    </Shell>
  );
}
