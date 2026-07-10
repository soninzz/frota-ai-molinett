"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Jornada (conectado à API real)
// Cole em: packages/web/app/jornada/page.tsx
// ============================================================

type Viagem = {
  id: string;
  kmRodado?: number | null;
  concluidaEm?: string | null;
  margemReal?: number | null;
  positivo?: boolean | null;
  veiculo: { placa: string; modelo: string };
  motorista: { id: string; usuario: { nome: string } };
  os: { numero: number; status: string };
};

const STATUS_COLOR: Record<string, string> = {
  AGUARDANDO: "#71717A",
  EM_ANDAMENTO: "#1E4C8C",
  CONCLUIDA: "#16A34A",
  CANCELADA: "#C0392B",
};

export default function JornadaPage() {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/viagens")
      .then((res) => setViagens(toList<Viagem>(res)))
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Agrega por motorista para o painel resumido
  const porMotorista = viagens.reduce<Record<string, { nome: string; viagens: number }>>((acc, v) => {
    const id = v.motorista.id;
    if (!acc[id]) acc[id] = { nome: v.motorista.usuario.nome, viagens: 0 };
    acc[id].viagens += 1;
    return acc;
  }, {});

  return (
    <Shell title="Jornada" subtitle={`${viagens.length} viagens registradas`}>
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-[13px] font-semibold text-zinc-900">Viagens recentes</h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">OS</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Motorista</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Veículo</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">KM rodado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Margem</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-[11px] uppercase tracking-wide">Status</th>
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
              {!loading && viagens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-[13px]">
                    Nenhuma viagem registrada
                  </td>
                </tr>
              )}
              {viagens.map((v) => (
                <tr key={v.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-zinc-900">
                    #{v.os.numero}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700">{v.motorista.usuario.nome}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600">{v.veiculo.placa}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-zinc-600">
                    {v.kmRodado ? `${v.kmRodado} km` : "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">
                    {v.margemReal != null ? (
                      <span className={v.positivo ? "text-[#16A34A]" : "text-[#C0392B]"}>{fmt(v.margemReal)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLOR[v.os.status] ?? "#71717A"}1A`,
                        color: STATUS_COLOR[v.os.status] ?? "#71717A",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[v.os.status] ?? "#71717A" }}
                      />
                      {v.os.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-[12px] font-semibold text-zinc-500 mb-3 uppercase tracking-wide">
            Painel por motorista
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(porMotorista).length === 0 && (
              <p className="text-zinc-400 text-[13px]">Sem dados ainda</p>
            )}
            {Object.values(porMotorista).map((m) => (
              <div key={m.nome} className="bg-white rounded-2xl border border-zinc-200 p-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-medium text-zinc-600">
                    {m.nome.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-[13px] font-semibold text-zinc-900">{m.nome}</span>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-[12px] text-zinc-500">Viagens</span>
                  <span className="font-mono tabular-nums text-[14px] font-semibold text-zinc-900">
                    {m.viagens}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}