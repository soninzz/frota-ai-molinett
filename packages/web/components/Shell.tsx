"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

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
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-zinc-200">
        <div className="h-7 w-7 rounded-md bg-[#1E4C8C] flex items-center justify-center">
          <span className="text-white text-xs font-bold tracking-tight">FA</span>
        </div>
        <span className="font-semibold text-zinc-900 tracking-tight text-[15px]">Frota AI</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = pathname === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-[#1E4C8C]/8 text-[#1E4C8C] font-medium"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <span className="text-[13px] w-4 text-center opacity-70">{it.icon}</span>
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-200">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer group">
          <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-zinc-900 truncate">Atendimento</div>
            <div className="text-[11px] text-zinc-500 truncate">Molinett</div>
          </div>
          <button
            onClick={sair}
            className="text-[11px] font-medium text-zinc-400 hover:text-[#C0392B] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">{title}</h1>
        <p className="text-[12px] text-zinc-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[12px] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          Meta do mês: 62% atingida
        </div>
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
  return (
    <div
      className="min-h-screen w-full bg-[#FAFAF9] text-zinc-900"
      style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title={title} subtitle={subtitle} />
          <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}