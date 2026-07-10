"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Raiz do site: manda pro dashboard se já tem sessão, senão pro login.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("frota_ai_token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <p className="text-[13px] text-zinc-400">Carregando...</p>
    </div>
  );
}
