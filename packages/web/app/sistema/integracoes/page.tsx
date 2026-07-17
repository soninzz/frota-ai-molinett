"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Saúde das integrações
// ============================================================

type SaudeIntegracao = {
  fonte: string;
  saude: "verde" | "amarelo" | "vermelho";
  ultimoStatus: string;
  ultimaAtualizacao: string;
  minutosDesdeUltimo: number;
  limiarMinutos: number;
  detalhes: string | null;
  erro: string | null;
};

const NOME_FONTE: Record<string, string> = {
  rastreador: "Rastreador Assemilsat",
  rastreador_megasat: "Rastreador MegaSat/STC",
  ocr_gemini: "OCR (Gemini Flash)",
  ocr_anthropic: "OCR (Anthropic)",
  bcb_sgs: "Taxas de mercado (BCB SGS)",
};

const COR: Record<string, string> = {
  verde: "#16A34A",
  amarelo: "#D97706",
  vermelho: "#C0392B",
};

const LABEL: Record<string, string> = {
  verde: "Funcionando",
  amarelo: "Degradado",
  vermelho: "Fora do ar / sem dados",
};

function tempoRelativo(min: number): string {
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export default function SaudeIntegracoesPage() {
  const [dados, setDados] = useState<SaudeIntegracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      const data = await api.get<SaudeIntegracao[]>("/integracoes/saude");
      setDados(Array.isArray(data) ? data : []);
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

  return (
    <Shell title="Saúde das integrações" subtitle="Status das fontes externas (rastreadores, OCR, taxas de mercado)">
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-400 dark:text-zinc-500 text-[13px] py-8">Carregando...</div>
        ) : dados.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
            Nenhuma integração registrou atividade ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dados.map((d) => (
              <div key={d.fonte} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-zinc-900 dark:text-white">{NOME_FONTE[d.fonte] ?? d.fonte}</h3>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: `${COR[d.saude]}1A`, color: COR[d.saude] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COR[d.saude] }} />
                    {LABEL[d.saude]}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                  Última atualização: <span className="text-zinc-700 dark:text-zinc-300">{tempoRelativo(d.minutosDesdeUltimo)}</span>
                </p>
                {d.detalhes && <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">{d.detalhes}</p>}
                {d.erro && <p className="text-[12px] text-[#C0392B] mt-1">{d.erro}</p>}
                <p className="text-[11px] text-zinc-300 mt-3">
                  limiar de alerta: {d.limiarMinutos >= 60 ? `${Math.round(d.limiarMinutos / 60)}h` : `${d.limiarMinutos}min`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
