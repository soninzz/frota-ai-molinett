"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Frota (conectado à API real)
// Cole em: packages/web/app/frota/page.tsx
// ============================================================

type PainelVeiculo = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  custoKmAtual: number | null;
  custoHoraAtual: number | null;
  alertas: {
    revisoesCriticas: number;
    documentosAVencer: number;
    segurosAVencer: number;
  };
  proximasRevisoes: { nome: string; kmProximo: number | null; dataProxima: string | null }[];
};

export default function FrotaPage() {
  const [veiculos, setVeiculos] = useState<PainelVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/frota/painel")
      .then((res) => setVeiculos(toList<PainelVeiculo>(res)))
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const custoMedio = veiculos.length
    ? veiculos.reduce((acc, v) => acc + (v.custoKmAtual ?? 0), 0) / veiculos.length
    : 0;
  const comAlerta = veiculos.filter(
    (v) => v.alertas.revisoesCriticas > 0 || v.alertas.documentosAVencer > 0 || v.alertas.segurosAVencer > 0
  ).length;

  return (
    <Shell title="Frota" subtitle={`${veiculos.length} veículos · custo por km atualizado em tempo real`}>
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-1">Total de veículos</p>
            <span className="font-mono tabular-nums text-[24px] font-semibold text-zinc-900">
              {veiculos.length}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-1">Com alerta pendente</p>
            <span className="font-mono tabular-nums text-[24px] font-semibold text-[#C0392B]">
              {comAlerta}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-1">Custo médio/km</p>
            <span className="font-mono tabular-nums text-[24px] font-semibold text-zinc-900">
              R$ {custoMedio.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-[13px] font-semibold text-zinc-900">Veículos</h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Placa</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Modelo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Custo/km</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && veiculos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhum veículo cadastrado
                  </td>
                </tr>
              )}
              {veiculos.map((v) => {
                const totalAlertas =
                  v.alertas.revisoesCriticas + v.alertas.documentosAVencer + v.alertas.segurosAVencer;
                return (
                  <tr key={v.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <a href={`/frota/veiculos/${v.id}`} className="font-mono tabular-nums font-semibold text-zinc-900 hover:text-[#E63A1F] hover:underline">
                        {v.placa}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600">
                      {v.marca} — {v.modelo}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-900">
                      {v.custoKmAtual ? `R$ ${v.custoKmAtual.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {totalAlertas > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#C0392B]/10 text-[#C0392B]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
                          {totalAlertas} pendente{totalAlertas > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#16A34A]/10 text-[#16A34A]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                          Em dia
                        </span>
                      )}
                      {v.proximasRevisoes.length > 0 && (
                        <span className="block text-[11px] text-zinc-400 mt-1">
                          {v.proximasRevisoes.map((r) => r.nome).join(", ")}
                        </span>
                      )}
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