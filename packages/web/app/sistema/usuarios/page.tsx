"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Gestão de usuários (Administrador)
// ============================================================

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  whatsappNumero: string | null;
  ativo: boolean;
  criadoEm: string;
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

const inputCls =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-white placeholder-zinc-400 outline-none transition-shadow focus:border-[#E63A1F] focus:ring-2 focus:ring-[#E63A1F]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// Banner de senha gerada — some quando o admin fecha, não fica recuperável
// depois (mesmo padrão de "mostrar uma vez" do backend).
function BannerSenha({ email, senha, onFechar }: { email: string; senha: string; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="bg-grid-dark bg-zinc-900 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#16A34A]/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wide mb-1.5">
            Senha gerada — só aparece essa vez
          </p>
          <p className="text-[13px] text-zinc-300 mb-2">
            Envie pro colaborador por WhatsApp ou como preferir. {email}
          </p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-[16px] font-bold text-white bg-white/10 rounded-lg px-3 py-1.5">
              {senha}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(senha);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="text-[12px] font-medium text-zinc-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500"
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
        <button onClick={onFechar} className="text-zinc-400 hover:text-white text-[13px] shrink-0">
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("OPERACIONAL");
  const [whatsapp, setWhatsapp] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const data = await api.get<Usuario[]>("/usuarios");
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      const res = await api.post<{ email: string; senhaTemporaria: string }>("/usuarios", {
        nome,
        email,
        perfil,
        whatsappNumero: whatsapp || undefined,
      });
      setSenhaGerada({ email: res.email, senha: res.senhaTemporaria });
      setNome("");
      setEmail("");
      setWhatsapp("");
      setPerfil("OPERACIONAL");
      setShowForm(false);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    setAlternando(id);
    try {
      await api.patch(`/usuarios/${id}/ativo`, { ativo });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAlternando(null);
    }
  }

  async function resetarSenha(id: string) {
    setAlternando(id);
    try {
      const res = await api.post<{ email: string; senhaTemporaria: string }>(`/usuarios/${id}/resetar-senha`, {});
      setSenhaGerada({ email: res.email, senha: res.senhaTemporaria });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAlternando(null);
    }
  }

  return (
    <Shell title="Usuários" subtitle={`${usuarios.length} contas — criar, desativar (offboarding) e resetar senha`}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo usuário"}
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[13px] px-4 py-3">
            {erro}
          </div>
        )}

        {senhaGerada && (
          <BannerSenha email={senhaGerada.email} senha={senhaGerada.senha} onFechar={() => setSenhaGerada(null)} />
        )}

        {showForm && (
          <form onSubmit={salvar} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">Novo usuário</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome">
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
              </Field>
              <Field label="E-mail">
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Perfil">
                <select className={inputCls + " appearance-none"} value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                  {Object.entries(NOME_PERFIL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="WhatsApp (opcional)">
                <input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="49999999999" />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E63A1F] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#BC2F19] transition-colors disabled:opacity-50"
            >
              {saving ? "Criando..." : "Criar usuário"}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Nome</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">E-mail</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Perfil</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wide text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-900 dark:text-white font-medium">{u.nome}</td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{NOME_PERFIL[u.perfil] ?? u.perfil}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: u.ativo ? "#16A34A1A" : "#C0392B1A",
                        color: u.ativo ? "#16A34A" : "#C0392B",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: u.ativo ? "#16A34A" : "#C0392B" }} />
                      {u.ativo ? "Ativo" : "Desativado"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-3">
                    <button
                      onClick={() => resetarSenha(u.id)}
                      disabled={alternando === u.id}
                      className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#E63A1F] transition-colors disabled:opacity-50"
                    >
                      Resetar senha
                    </button>
                    <button
                      onClick={() => alternarAtivo(u.id, !u.ativo)}
                      disabled={alternando === u.id}
                      className={`text-[12px] font-medium transition-colors disabled:opacity-50 ${
                        u.ativo ? "text-[#C0392B] hover:text-[#952514]" : "text-[#16A34A] hover:text-[#128A3E]"
                      }`}
                    >
                      {u.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
