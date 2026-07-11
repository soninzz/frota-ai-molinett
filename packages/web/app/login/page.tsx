"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Login
// Cole em: packages/web/app/login/page.tsx
// ============================================================

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const resultado = await api.post<{ access_token: string }>("/auth/login", { email, senha });
      setToken(resultado.access_token);
      router.push("/dashboard");
    } catch {
      setErro("E-mail ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full bg-[#FAFAF9] text-zinc-900 flex"
      style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}
    >
      <div className="hidden lg:flex lg:w-[46%] bg-zinc-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[#1E4C8C]/25 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#C0392B]/10 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[#1E4C8C] flex items-center justify-center">
            <span className="text-white text-xs font-bold tracking-tight">FA</span>
          </div>
          <span className="font-semibold text-white tracking-tight text-[16px]">Frota AI</span>
        </div>

        <div className="relative">
          <p className="text-[13px] font-medium text-[#16A34A] mb-3">Custo/km atualizado a cada abastecimento</p>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-mono tabular-nums text-[40px] leading-none font-semibold text-white tracking-tight">
              Frota AI
            </span>
          </div>
          <p className="text-[14px] text-zinc-400 leading-relaxed max-w-sm">
            Cada cotação já nasce com o custo real da frota — sem planilha, sem defasagem,
            sem margem perdida por dado desatualizado.
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-[12px] text-zinc-500">
          <span>Transportes Molinett</span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>Painel operacional</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-md bg-[#1E4C8C] flex items-center justify-center">
              <span className="text-white text-xs font-bold tracking-tight">FA</span>
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight text-[16px]">Frota AI</span>
          </div>

          <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight mb-1.5">
            Entrar no painel
          </h1>
          <p className="text-[13px] text-zinc-500 mb-8">
            Acesse com sua conta da Transportes Molinett
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {erro && (
              <div className="rounded-lg bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[12px] px-3.5 py-2.5">
                {erro}
              </div>
            )}
            <label className="block">
              <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">E-mail</span>
              <input
                type="email"
                className={inputCls}
                placeholder="voce@molinett.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-zinc-500">Senha</span>
                <a href="#" className="text-[12px] font-medium text-[#1E4C8C] hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  className={inputCls + " pr-11"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-zinc-400 hover:text-zinc-600"
                >
                  {showSenha ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1E4C8C] text-white text-[14px] font-medium py-3 hover:bg-[#173d70] transition-colors mt-2 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-[11px] text-zinc-400 font-medium">OU</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <button className="w-full rounded-xl border border-zinc-200 bg-white text-[14px] font-medium text-zinc-700 py-3 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
            <span className="text-[15px]">◈</span>
            Entrar com WhatsApp
          </button>

          <p className="text-[12px] text-zinc-400 text-center mt-8">
            Acesso restrito à equipe da Transportes Molinett
          </p>
        </div>
      </div>
    </div>
  );
}