"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, clearToken } from "@/lib/api";

const TEMA_STORAGE_KEY = "molinett_tema";

function useTema() {
  const [tema, setTema] = useState<"claro" | "escuro">("claro");

  useEffect(() => {
    const salvo = localStorage.getItem(TEMA_STORAGE_KEY);
    const inicial =
      salvo === "escuro" || salvo === "claro"
        ? salvo
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "escuro"
          : "claro";
    setTema(inicial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
    localStorage.setItem(TEMA_STORAGE_KEY, tema);
  }, [tema]);

  return { tema, alternarTema: () => setTema((t) => (t === "claro" ? "escuro" : "claro")) };
}

// ============================================================
// FROTA AI · Molinett — Shell compartilhado (Sidebar + Topbar)
// Cole em: packages/web/components/Shell.tsx
// ============================================================

const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "▣" },
      { label: "Aprovações", href: "/aprovacoes", icon: "◈" },
      { label: "Alertas", href: "/alertas", icon: "◉" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Cotação", href: "/cotacao", icon: "◆" },
      { label: "Histórico de cotações", href: "/cotacao/historico", icon: "▪" },
      { label: "Clientes", href: "/clientes", icon: "◐" },
    ],
  },
  {
    label: "Frota",
    items: [
      { label: "Painel da frota", href: "/frota", icon: "▤" },
      { label: "Mapa ao vivo", href: "/frota/mapa", icon: "◎" },
      { label: "Veículos", href: "/frota/cadastro", icon: "▦" },
      { label: "Manutenção", href: "/manutencao", icon: "▧" },
      { label: "Diesel", href: "/diesel", icon: "▨" },
      { label: "Pneus", href: "/frota/pneus", icon: "◑" },
      { label: "Sinistros", href: "/frota/sinistros", icon: "◬" },
    ],
  },
  {
    label: "Jornada",
    items: [
      { label: "Viagens", href: "/jornada", icon: "▧" },
      { label: "Motoristas", href: "/jornada/cadastro", icon: "◔" },
      { label: "Comissões", href: "/jornada/comissoes", icon: "◕" },
      { label: "Lei do Motorista", href: "/jornada/lei-motorista", icon: "◈" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Painel financeiro", href: "/financeiro", icon: "▥" },
      { label: "Lançamentos", href: "/financeiro/lancamentos", icon: "▩" },
      { label: "Simulador", href: "/financeiro/simulador", icon: "◫" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Saúde das integrações", href: "/sistema/integracoes", icon: "◍" },
      { label: "Permissões", href: "/sistema/permissoes", icon: "◫" },
    ],
  },
];

function SidebarConteudo({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    clearToken();
    router.push("/login");
  }

  return (
    <>
      <div className="flex items-center px-5 h-16 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <Image src="/logo-molinett.png" alt="Auto Socorro Molinett" width={140} height={36} className="h-8 w-auto object-contain" priority />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = pathname === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={`relative flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg text-[13px] transition-colors ${
                      active
                        ? "bg-[#E63A1F]/[0.07] text-[#E63A1F] font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#E63A1F]" />}
                    <span className="text-[13px] w-4 text-center opacity-80">{it.icon}</span>
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer group">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">Atendimento</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Molinett</div>
          </div>
          <button
            onClick={sair}
            className="text-[11px] font-medium text-zinc-400 hover:text-[#C0392B] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

// Desktop/tablet largo: fixa na lateral. Abaixo de md: vira gaveta (drawer)
// aberta pelo botão de menu na Topbar — antes disso a sidebar simplesmente
// desaparecia sem nenhum jeito de navegar em celular/tablet retrato.
export function Sidebar({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full">
        <SidebarConteudo />
      </aside>

      {aberta && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={onFechar} />
          <aside className="relative w-72 max-w-[80vw] flex flex-col bg-white dark:bg-zinc-900 h-full shadow-xl">
            <SidebarConteudo onNavigate={onFechar} />
          </aside>
        </div>
      )}
    </>
  );
}

export function Topbar({
  title,
  subtitle,
  onAbrirMenu,
  tema,
  onAlternarTema,
}: {
  title: string;
  subtitle: string;
  onAbrirMenu: () => void;
  tema: "claro" | "escuro";
  onAlternarTema: () => void;
}) {
  const [pctMeta, setPctMeta] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ metas: { faturamentoMinimo: number }; fluxo30dias: { totais: { entradas: number } } }>("/financeiro/painel")
      .then((painel) => {
        if (!painel.metas?.faturamentoMinimo) return;
        const pct = Math.min(100, Math.round((painel.fluxo30dias.totais.entradas / painel.metas.faturamentoMinimo) * 100));
        setPctMeta(pct);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onAbrirMenu}
          className="md:hidden shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          aria-label="Abrir menu"
        >
          <span className="text-[18px]">☰</span>
        </button>
        <div className="min-w-0">
          <h1 className="text-[16px] font-bold text-zinc-900 dark:text-white tracking-tight truncate">{title}</h1>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {pctMeta !== null && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[12px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Meta do mês: {pctMeta}% atingida
          </div>
        )}
        <button
          onClick={onAlternarTema}
          aria-label={tema === "claro" ? "Ativar modo escuro" : "Ativar modo claro"}
          title={tema === "claro" ? "Ativar modo escuro" : "Ativar modo claro"}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0"
        >
          <span className="text-[16px]">{tema === "claro" ? "☾" : "☀"}</span>
        </button>
      </div>
    </header>
  );
}

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { tema, alternarTema } = useTema();

  return (
    <div
      className="h-screen w-full bg-[#FAF8F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden"
      style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}
    >
      <div className="flex h-full">
        <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <Topbar
            title={title}
            subtitle={subtitle}
            onAbrirMenu={() => setMenuAberto(true)}
            tema={tema}
            onAlternarTema={alternarTema}
          />
          <main className="bg-grid dark:bg-grid-dark flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="max-w-6xl w-full mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}