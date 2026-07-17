"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — RBAC editável pelo Administrador
// ============================================================

type LinhaRecurso = { recurso: string; override: boolean | null; atualizadoEm: string | null };
type LinhaPerfil = { perfil: string; recursos: LinhaRecurso[] };

const NOME_PERFIL: Record<string, string> = {
  ATENDIMENTO: "Atendimento",
  MOTORISTA: "Motorista",
  OPERACIONAL: "Operacional",
  GESTOR_MANUTENCAO: "Gestor de Manutenção",
  FINANCEIRO: "Financeiro",
  GESTOR_PRINCIPAL: "Gestor Principal",
  ADMINISTRADOR: "Administrador",
};

const NOME_RECURSO: Record<string, string> = {
  cotacao: "Cotação",
  frota: "Frota",
  manutencao: "Manutenção",
  diesel: "Diesel",
  pneus: "Pneus",
  financeiro: "Financeiro",
  jornada: "Jornada",
  clientes: "Clientes",
  sinistros: "Sinistros",
  simulador: "Simulador",
  ocr: "OCR",
  auditoria: "Auditoria",
  integracoes: "Integrações",
};

export default function PermissoesPage() {
  const [matriz, setMatriz] = useState<LinhaPerfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregar() {
    try {
      const data = await api.get<LinhaPerfil[]>("/sistema/permissoes");
      setMatriz(Array.isArray(data) ? data : []);
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function ciclarOverride(perfil: string, recurso: string, atual: boolean | null) {
    // ciclo: padrão (null) -> liberado (true) -> bloqueado (false) -> padrão (null)
    const proximo = atual === null ? true : atual === true ? false : null;
    const chave = `${perfil}:${recurso}`;
    setSalvando(chave);
    try {
      await api.patch("/sistema/permissoes", { perfil, recurso, permitido: proximo });
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(null);
    }
  }

  const recursos = matriz[0]?.recursos.map((r) => r.recurso) ?? [];

  return (
    <Shell
      title="Permissões (RBAC)"
      subtitle="Libere ou bloqueie acesso por perfil sem precisar de deploy — clique numa célula pra alternar"
    >
      <div className="space-y-4">
        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex items-center gap-4 text-[12px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900" /> padrão do sistema
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[#16A34A]" /> liberado (override)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[#C0392B]" /> bloqueado (override)
          </span>
        </div>

        {loading ? (
          <div className="text-center text-zinc-400 dark:text-zinc-500 text-[13px] py-8">Carregando...</div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 sticky left-0 bg-white dark:bg-zinc-900">Perfil</th>
                  {recursos.map((r) => (
                    <th key={r} className="px-3 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {NOME_RECURSO[r] ?? r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.map((linha) => (
                  <tr key={linha.perfil} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white sticky left-0 bg-white dark:bg-zinc-900 whitespace-nowrap">
                      {NOME_PERFIL[linha.perfil] ?? linha.perfil}
                    </td>
                    {linha.recursos.map((r) => {
                      const chave = `${linha.perfil}:${r.recurso}`;
                      const cor = r.override === true ? "#16A34A" : r.override === false ? "#C0392B" : "transparent";
                      return (
                        <td key={r.recurso} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => ciclarOverride(linha.perfil, r.recurso, r.override)}
                            disabled={salvando === chave}
                            className="h-5 w-5 rounded border border-zinc-300 dark:border-zinc-700 mx-auto block transition-colors disabled:opacity-50"
                            style={{ backgroundColor: cor }}
                            title={
                              r.override === null
                                ? "Padrão do sistema — clique pra liberar"
                                : r.override
                                  ? "Liberado por override — clique pra bloquear"
                                  : "Bloqueado por override — clique pra voltar ao padrão"
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
