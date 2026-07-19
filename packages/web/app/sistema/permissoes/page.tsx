"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — RBAC editável pelo Administrador
// ============================================================

type LinhaRecurso = { recurso: string; override: boolean | null; atualizadoEm: string | null };
type LinhaPerfil = { perfil: string; recursos: LinhaRecurso[] };

type Acao = "LER" | "ESCREVER" | "APROVAR" | "CONFIGURAR";
type LinhaAcao = { acao: Acao; override: boolean | null; atualizadoEm: string | null };
type RecursoAcoes = { recurso: string; acoes: LinhaAcao[] };
type LinhaPerfilAcoes = { perfil: string; recursos: RecursoAcoes[] };

const NOME_ACAO: Record<Acao, string> = {
  LER: "Ler",
  ESCREVER: "Escrever",
  APROVAR: "Aprovar",
  CONFIGURAR: "Configurar",
};

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
  usuarios: "Usuários",
};

export default function PermissoesPage() {
  const [matriz, setMatriz] = useState<LinhaPerfil[]>([]);
  const [matrizAcoes, setMatrizAcoes] = useState<LinhaPerfilAcoes[]>([]);
  const [recursoAcaoSelecionado, setRecursoAcaoSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregar() {
    try {
      const [data, dataAcoes] = await Promise.all([
        api.get<LinhaPerfil[]>("/sistema/permissoes"),
        api.get<LinhaPerfilAcoes[]>("/sistema/permissoes/acoes"),
      ]);
      setMatriz(Array.isArray(data) ? data : []);
      setMatrizAcoes(Array.isArray(dataAcoes) ? dataAcoes : []);
      setRecursoAcaoSelecionado((atual) => atual || dataAcoes[0]?.recursos[0]?.recurso || "");
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

  async function ciclarOverrideAcao(perfil: string, recurso: string, acao: Acao, atual: boolean | null) {
    const proximo = atual === null ? true : atual === true ? false : null;
    const chave = `${perfil}:${recurso}:${acao}`;
    setSalvando(chave);
    try {
      await api.patch("/sistema/permissoes/acoes", { perfil, recurso, acao, permitido: proximo });
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(null);
    }
  }

  const recursos = matriz[0]?.recursos.map((r) => r.recurso) ?? [];
  const recursosComAcao = matrizAcoes[0]?.recursos.map((r) => r.recurso) ?? [];

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

        {!loading && recursosComAcao.length > 0 && (
          <div className="space-y-3 pt-4">
            <div>
              <h2 className="text-[14px] font-medium text-zinc-900 dark:text-white">Permissões granulares (ler/escrever/aprovar/configurar)</h2>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Só vale pra rotas já preparadas pra esse nível de controle — o restante continua regido pela tabela acima. Escolha o recurso e clique numa célula pra alternar.
              </p>
            </div>

            <select
              value={recursoAcaoSelecionado}
              onChange={(e) => setRecursoAcaoSelecionado(e.target.value)}
              className="text-[13px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-900 dark:text-white"
            >
              {recursosComAcao.map((r) => (
                <option key={r} value={r}>
                  {NOME_RECURSO[r] ?? r}
                </option>
              ))}
            </select>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 sticky left-0 bg-white dark:bg-zinc-900">Perfil</th>
                    {(["LER", "ESCREVER", "APROVAR", "CONFIGURAR"] as Acao[]).map((acao) => (
                      <th key={acao} className="px-3 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {NOME_ACAO[acao]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrizAcoes.map((linha) => {
                    const recursoLinha = linha.recursos.find((r) => r.recurso === recursoAcaoSelecionado);
                    if (!recursoLinha) return null;
                    return (
                      <tr key={linha.perfil} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white sticky left-0 bg-white dark:bg-zinc-900 whitespace-nowrap">
                          {NOME_PERFIL[linha.perfil] ?? linha.perfil}
                        </td>
                        {recursoLinha.acoes.map((a) => {
                          const chave = `${linha.perfil}:${recursoAcaoSelecionado}:${a.acao}`;
                          const cor = a.override === true ? "#16A34A" : a.override === false ? "#C0392B" : "transparent";
                          return (
                            <td key={a.acao} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => ciclarOverrideAcao(linha.perfil, recursoAcaoSelecionado, a.acao, a.override)}
                                disabled={salvando === chave}
                                className="h-5 w-5 rounded border border-zinc-300 dark:border-zinc-700 mx-auto block transition-colors disabled:opacity-50"
                                style={{ backgroundColor: cor }}
                                title={
                                  a.override === null
                                    ? "Padrão do sistema — clique pra liberar"
                                    : a.override
                                      ? "Liberado por override — clique pra bloquear"
                                      : "Bloqueado por override — clique pra voltar ao padrão"
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
