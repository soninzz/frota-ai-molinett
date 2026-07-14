// ============================================================
// FROTA AI · Molinett — Cliente de API compartilhado
// Cole em: packages/web/lib/api.ts
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("frota_ai_token");
}

export function setToken(token: string) {
  localStorage.setItem("frota_ai_token", token);
}

export function clearToken() {
  localStorage.removeItem("frota_ai_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Erro ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Baixa um arquivo (CSV/XLSX) de um endpoint autenticado direto no navegador
export async function downloadFile(path: string, nomeArquivoFallback: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao exportar`);

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const nomeArquivo = match ? match[1] : nomeArquivoFallback;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Normaliza qualquer formato de lista que a API devolva:
// array puro, { data: [...] }, { items: [...] } ou { results: [...] }
export function toList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    // Fallback: pega a primeira propriedade do objeto que seja um array
    // (cobre formatos como { cotacoes: [...] }, { veiculos: [...] } etc.)
    for (const key in obj) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

// ── Tipos básicos usados nas telas ──
export type Veiculo = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  ativo: boolean;
  custoKmAtual?: number | null;
};

export type Motorista = {
  id: string;
  cpf: string;
  cnh: string;
  cnhCategoria: string;
  cnhVencimento: string;
  comissaoPct: number;
  usuario: { nome: string; email: string; ativo: boolean };
};