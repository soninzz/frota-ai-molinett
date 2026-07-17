"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, downloadFile } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Lei do Motorista (13.103/2015) + Hora extra por classe (S04)
// ============================================================

const inputCls =
  "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-white outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

type Violacao = { tipo: string; viagemId: string; detalhe: string };

type MotoristaRelatorio = {
  motoristaId: string;
  motorista: string;
  viagensAnalisadas: number;
  horasDirecaoTotal: number;
  horasEsperaTotal: number;
  horasJornadaTotal: number;
  violacoes: Violacao[];
  conforme: boolean;
};

type Relatorio = {
  parametros: {
    limiteDirecaoDiariaHoras: number;
    descansoInterjornadaHoras: number;
    descansoSemanalHoras: number;
    limiteDirecaoContinuaHoras: number;
    pausaDirecaoMinutos: number;
    intrajornadaRefeicaoMinutos: number;
  };
  motoristas: MotoristaRelatorio[];
  totalViolacoes: number;
};

type ClasseHoraExtra = {
  classe: string;
  horasTotal: number;
  valorTotal: number;
  motoristas: { nome: string; horas: number; valor: number }[];
};

type RelatorioClasses = { classes: ClasseHoraExtra[] };

const TIPO_VIOLACAO: Record<string, string> = {
  DIRECAO_DIARIA_EXCEDIDA: "Direção diária excedida",
  INTERJORNADA_INSUFICIENTE: "Descanso interjornada insuficiente",
  DESCANSO_SEMANAL_INSUFICIENTE: "Descanso semanal insuficiente (35h)",
  DIRECAO_CONTINUA_EXCEDIDA: "Direção contínua excedida (5h30 sem pausa)",
  INTRAJORNADA_AUSENTE: "Intervalo de refeição ausente (1h)",
};

export default function LeiMotoristaPage() {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [classes, setClasses] = useState<RelatorioClasses | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [exportando, setExportando] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro(null);
    const qs = new URLSearchParams();
    if (dataInicio) qs.set("dataInicio", dataInicio);
    if (dataFim) qs.set("dataFim", dataFim);
    const sufixo = qs.toString() ? `?${qs.toString()}` : "";
    try {
      const [rel, cls] = await Promise.all([
        api.get<Relatorio>(`/jornada/lei-motorista${sufixo}`),
        api.get<RelatorioClasses>(`/jornada/horas-extra/por-classe${sufixo}`),
      ]);
      setRelatorio(rel);
      setClasses(cls);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportarCsv() {
    setExportando(true);
    const qs = new URLSearchParams();
    if (dataInicio) qs.set("dataInicio", dataInicio);
    if (dataFim) qs.set("dataFim", dataFim);
    const sufixo = qs.toString() ? `?${qs.toString()}` : "";
    try {
      await downloadFile(`/jornada/horas-extra/exportar${sufixo}`, "horas-extra.csv");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setExportando(false);
    }
  }

  return (
    <Shell
      title="Lei do Motorista"
      subtitle="Conformidade com a Lei 13.103/2015 e horas extra por classe"
    >
      <div className="space-y-6">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex items-end gap-3">
          <label className="block">
            <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">De</span>
            <input type="date" className={inputCls} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Até</span>
            <input type="date" className={inputCls} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
          <button
            onClick={carregar}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            Filtrar
          </button>
        </div>

        {relatorio && (
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-[12px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-5 gap-y-1.5">
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.limiteDirecaoContinuaHoras}h</b> direção contínua máx. (CTB art. 67-C)</span>
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.pausaDirecaoMinutos}min</b> pausa de direção</span>
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.intrajornadaRefeicaoMinutos}min</b> refeição obrigatória (CLT 235-C §2º)</span>
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.limiteDirecaoDiariaHoras}h</b> direção/dia</span>
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.descansoInterjornadaHoras}h</b> interjornada</span>
            <span><b className="text-zinc-700 dark:text-zinc-300">{relatorio.parametros.descansoSemanalHoras}h</b> descanso semanal</span>
          </div>
        )}

        {relatorio && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-400" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Motoristas analisados</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-zinc-900 dark:text-white">
                {relatorio.motoristas.length}
              </span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ backgroundColor: relatorio.totalViolacoes > 0 ? "#C0392B" : "#16A34A" }}
              />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Violações encontradas</p>
              <span
                className="font-mono tabular-nums text-[28px] font-bold"
                style={{ color: relatorio.totalViolacoes > 0 ? "#C0392B" : "#16A34A" }}
              >
                {relatorio.totalViolacoes}
              </span>
            </div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#16A34A]" />
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2.5">Em conformidade</p>
              <span className="font-mono tabular-nums text-[28px] font-bold text-[#16A34A]">
                {relatorio.motoristas.filter((m) => m.conforme).length}/{relatorio.motoristas.length}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Conformidade por motorista</h2>
          </div>
          {loading && <p className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">Carregando...</p>}
          {!loading && (!relatorio || relatorio.motoristas.length === 0) && (
            <p className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">Nenhuma viagem no período</p>
          )}
          {!loading &&
            relatorio?.motoristas.map((m) => (
              <div key={m.motoristaId} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-bold text-zinc-900 dark:text-white">{m.motorista}</span>
                    <span className="ml-3 text-[12px] text-zinc-400 dark:text-zinc-500">
                      {m.viagensAnalisadas} viagem(ns) · {m.horasDirecaoTotal}h de direção ·{" "}
                      {m.horasEsperaTotal}h de espera · {m.horasJornadaTotal}h de jornada total
                    </span>
                  </div>
                  {m.conforme ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#16A34A]/10 text-[#16A34A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                      Conforme
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#C0392B]/10 text-[#C0392B]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
                      {m.violacoes.length} violação(ões)
                    </span>
                  )}
                </div>
                {m.violacoes.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {m.violacoes.map((v, i) => (
                      <li key={i} className="text-[12px] text-zinc-600 dark:text-zinc-300 flex gap-2">
                        <span className="font-medium text-[#C0392B] shrink-0">
                          {TIPO_VIOLACAO[v.tipo] ?? v.tipo}:
                        </span>
                        {v.detalhe}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Hora extra por classe</h2>
            <button
              onClick={exportarCsv}
              disabled={exportando}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[12px] font-medium px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
            >
              {exportando ? "Exportando..." : "Exportar CSV (folha de pagamento)"}
            </button>
          </div>
          {!loading && (!classes || classes.classes.length === 0) && (
            <p className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">Nenhuma hora extra registrada no período</p>
          )}
          {classes?.classes.map((c) => (
            <div key={c.classe} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
              <div className="px-5 py-3.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60/50">
                <span className="text-[13px] font-bold text-zinc-900 dark:text-white">{c.classe}</span>
                <span className="font-mono tabular-nums text-[13px] text-zinc-600 dark:text-zinc-300">
                  {c.horasTotal}h · R$ {c.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {c.motoristas.map((m) => (
                    <tr key={m.nome} className="border-t border-zinc-50 dark:border-zinc-800/50">
                      <td className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300">{m.nome}</td>
                      <td className="px-5 py-2.5 font-mono tabular-nums text-zinc-500 dark:text-zinc-400 text-right">{m.horas}h</td>
                      <td className="px-5 py-2.5 font-mono tabular-nums text-zinc-900 dark:text-white text-right">
                        R$ {m.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
