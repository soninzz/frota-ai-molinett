"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, toList, Veiculo } from "@/lib/api";

// ============================================================
// FROTA AI · Molinett — Cotação (conectado à API real)
// Cole em: packages/web/app/cotacao/page.tsx
// ============================================================

type Cliente = { id: string; nome: string };

type MotoristaOpcao = { id: string; usuario: { nome: string } };

type Cenario = { margem: number; valorFinal: number; lucro: number; precoKm: number };

type ResultadoCalculo = {
  cotacaoId: string;
  veiculo: { placa: string; modelo: string };
  cliente: { nome: string };
  rota: { origem: string; destino: string; kmEstimado: number };
  custoKm: number;
  custoBase: number;
  cenarios: Cenario[];
  saldoARecuperar: number;
  margemSugerida: number;
  tabelaMinima?: { valorSaida: number; mediaKm: number } | null;
};

type ResultadoConfirmacao = {
  os: { id: string; numero: number; valorFinal: number; margem: number; status: string };
  alertaMetas?: { precisaAprovacao: boolean; mensagem: string };
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-[#1E4C8C] focus:ring-2 focus:ring-[#1E4C8C]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-zinc-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function CotacaoPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motoristas, setMotoristas] = useState<MotoristaOpcao[]>([]);

  const [veiculoId, setVeiculoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [origem, setOrigem] = useState("Chapecó");
  const [destino, setDestino] = useState("Xanxerê");
  const [km, setKm] = useState(120);

  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [margemSel, setMargemSel] = useState(10);
  const [margemCustomAtiva, setMargemCustomAtiva] = useState(false);
  const [margemCustom, setMargemCustom] = useState<number | "">("");
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState<ResultadoConfirmacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get("/frota/veiculos"), api.get("/clientes"), api.get("/motoristas")])
      .then(([vs, cs, ms]) => {
        const listaV = toList<Veiculo>(vs);
        const listaC = toList<Cliente>(cs);
        const listaM = toList<MotoristaOpcao>(ms);
        setVeiculos(listaV);
        setClientes(listaC);
        setMotoristas(listaM);
        if (listaV.length) setVeiculoId(listaV[0].id);
        if (listaC.length) setClienteId(listaC[0].id);
        if (listaM.length) setMotoristaId(listaM[0].id);
      })
      .catch((e) => setErro((e as Error).message));
  }, []);

  async function calcular() {
    setCalculando(true);
    setErro(null);
    setConfirmado(null);
    try {
      const res = await api.post<ResultadoCalculo>("/cotacoes/calcular", {
        veiculoId,
        clienteId,
        motoristaId: motoristaId || undefined,
        origem,
        destino,
        kmEstimado: km,
      });
      setResultado(res);
      setMargemSel(res.margemSugerida ?? 10);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCalculando(false);
    }
  }

  const [pendenteAprovacao, setPendenteAprovacao] = useState(false);

  async function confirmar() {
    if (!resultado) return;
    setConfirmando(true);
    setErro(null);
    setPendenteAprovacao(false);
    try {
      const res = await api.post<ResultadoConfirmacao>("/cotacoes/confirmar", {
        cotacaoId: resultado.cotacaoId,
        margemPct: margemCustomAtiva ? Number(margemCustom) : margemSel,
      });
      setConfirmado(res);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("pendente de aprovação")) {
        setPendenteAprovacao(true);
      } else {
        setErro(msg);
      }
    } finally {
      setConfirmando(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

  const cenarioSel = margemCustomAtiva
    ? resultado && margemCustom !== ""
      ? {
          margem: Number(margemCustom),
          valorFinal: parseFloat((resultado.custoBase * (1 + Number(margemCustom) / 100)).toFixed(2)),
          lucro: parseFloat((resultado.custoBase * (Number(margemCustom) / 100)).toFixed(2)),
          precoKm: 0,
        }
      : null
    : resultado?.cenarios.find((c) => c.margem === margemSel);

  return (
    <Shell title="Nova cotação" subtitle="Calcule margem em segundos">
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-[13px] font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <span className="text-[#1E4C8C]">◆</span> Detalhes da viagem
          </h2>

          <div className="space-y-4">
            <Field label="Veículo">
              <select className={inputCls + " appearance-none"} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.modelo}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cliente">
              <select className={inputCls + " appearance-none"} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Motorista">
              <select className={inputCls + " appearance-none"} value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
                <option value="">Definir depois</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.usuario.nome}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Origem">
                <input className={inputCls} value={origem} onChange={(e) => setOrigem(e.target.value)} />
              </Field>
              <Field label="Destino">
                <input className={inputCls} value={destino} onChange={(e) => setDestino(e.target.value)} />
              </Field>
            </div>

            <Field label="KM estimado">
              <input
                type="number"
                className={inputCls + " font-mono tabular-nums"}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
              />
            </Field>

            {erro && (
              <div className="rounded-lg bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[12px] px-3.5 py-2.5">
                {erro}
              </div>
            )}

            <button
              onClick={calcular}
              disabled={calculando || !veiculoId || !clienteId}
              className="w-full rounded-xl bg-[#1E4C8C] text-white text-[14px] font-medium py-3 hover:bg-[#173d70] transition-colors disabled:opacity-50"
            >
              {calculando ? "Calculando..." : "Calcular cotação"}
            </button>

            {resultado && (
              <div className="pt-3 border-t border-zinc-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-zinc-500">Custo/km atual</span>
                  <span className="font-mono tabular-nums text-[13px] font-semibold text-zinc-900">
                    {fmt(resultado.custoKm)}/km
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-[12px] font-medium text-zinc-500">Custo base da viagem</span>
                  <span className="font-mono tabular-nums text-[13px] font-semibold text-zinc-900">
                    {fmt(resultado.custoBase)}
                  </span>
                </div>
                {resultado.tabelaMinima && (
                  <div className="mt-2 rounded-lg bg-[#1E4C8C]/6 px-3 py-2">
                    <p className="text-[11px] font-medium text-[#1E4C8C]">
                      Piso desse cliente: {fmt(resultado.tabelaMinima.valorSaida)} · média {resultado.tabelaMinima.mediaKm.toFixed(2)} R$/km
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {!resultado && !confirmado && (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-400 text-[13px]">
              Preencha os dados e clique em &ldquo;Calcular cotação&rdquo; para ver os cenários de margem
            </div>
          )}

          {resultado && !confirmado && (
            <>
              <div className="bg-zinc-900 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1E4C8C]/25 blur-2xl" />
                <p className="text-[12px] font-medium text-zinc-400 mb-1">
                  Valor sugerido (margem {margemCustomAtiva ? margemCustom || 0 : margemSel}%)
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-mono tabular-nums text-[42px] leading-none font-semibold text-white tracking-tight">
                    {fmt(cenarioSel?.valorFinal ?? 0)}
                  </span>
                  <span className="text-[13px] text-[#16A34A] font-medium pb-1.5">
                    +{fmt(cenarioSel?.lucro ?? 0)} lucro
                  </span>
                </div>
                <p className="text-[12px] text-zinc-400 mt-3">
                  {resultado.rota.origem} → {resultado.rota.destino} · {resultado.rota.kmEstimado} km ·{" "}
                  {resultado.veiculo.placa}
                </p>
              </div>

              <div>
                <h3 className="text-[12px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
                  Cenários de margem
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {resultado.cenarios.map((c) => (
                    <button
                      key={c.margem}
                      onClick={() => {
                        setMargemSel(c.margem);
                        setMargemCustomAtiva(false);
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        !margemCustomAtiva && margemSel === c.margem
                          ? "border-[#1E4C8C] bg-[#1E4C8C]/6 ring-2 ring-[#1E4C8C]/15"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="text-[11px] font-medium text-zinc-500">{c.margem}%</div>
                      <div className="font-mono tabular-nums text-[14px] font-semibold text-zinc-900 mt-1">
                        {fmt(c.valorFinal)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-[11px] mt-0.5 ${
                          c.lucro >= 0 ? "text-[#16A34A]" : "text-[#C0392B]"
                        }`}
                      >
                        {c.lucro >= 0 ? "+" : ""}
                        {fmt(c.lucro)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                <label className="flex items-center gap-2 text-[12px] font-medium text-zinc-600 mb-3">
                  <input
                    type="checkbox"
                    checked={margemCustomAtiva}
                    onChange={(e) => setMargemCustomAtiva(e.target.checked)}
                  />
                  Usar margem customizada (inclusive negativa)
                </label>
                {margemCustomAtiva && (
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls + " font-mono tabular-nums"}
                        placeholder="Ex: -5 para margem negativa"
                        value={margemCustom}
                        onChange={(e) => setMargemCustom(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-[13px] text-zinc-500 whitespace-nowrap">%</span>
                    </div>
                    {margemCustom !== "" && Number(margemCustom) < 0 && (
                      <p className="text-[11px] text-[#C0392B] mt-2">
                        Margem negativa exige aprovação do gestor — a cotação será salva como pendente até ser aprovada em{" "}
                        <span className="font-medium">Aprovações</span>.
                      </p>
                    )}
                  </>
                )}
              </div>

              {resultado.saldoARecuperar > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                  <p className="text-[12px] text-zinc-500">
                    Saldo a recuperar da empresa: <span className="font-mono font-medium text-[#C0392B]">{fmt(resultado.saldoARecuperar)}</span>
                  </p>
                </div>
              )}

              {pendenteAprovacao ? (
                <div className="bg-white rounded-2xl border border-[#1E4C8C]/30 p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#1E4C8C]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-[#1E4C8C] text-[20px]">◈</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-900 mb-1">
                    Cotação enviada para aprovação do gestor
                  </h3>
                  <p className="text-[13px] text-zinc-500 mb-4">
                    Margem negativa exige aprovação. A OS só é gerada depois que o gestor aprovar em Aprovações.
                  </p>
                  <a
                    href="/aprovacoes"
                    className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors inline-block"
                  >
                    Ver fila de aprovações
                  </a>
                </div>
              ) : (
                <button
                  onClick={confirmar}
                  disabled={confirmando}
                  className="w-full rounded-xl bg-[#1E4C8C] text-white text-[14px] font-medium py-3 hover:bg-[#173d70] transition-colors disabled:opacity-50"
                >
                  {confirmando ? "Confirmando..." : "Confirmar cotação e gerar OS"}
                </button>
              )}
            </>
          )}

          {confirmado && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#16A34A] text-[20px]">✓</span>
              </div>
              <h3 className="text-[16px] font-semibold text-zinc-900 mb-1">
                OS #{confirmado.os.numero} gerada com sucesso
              </h3>
              <p className="text-[13px] text-zinc-500 mb-4">
                {fmt(confirmado.os.valorFinal)} · margem {confirmado.os.margem}% · status {confirmado.os.status}
              </p>
              {confirmado.alertaMetas?.precisaAprovacao && (
                <div className="rounded-lg bg-[#C0392B]/8 border border-[#C0392B]/20 text-[#C0392B] text-[12px] px-3.5 py-2.5 mb-4 text-left">
                  {confirmado.alertaMetas.mensagem}
                </div>
              )}
              <button
                onClick={() => {
                  setResultado(null);
                  setConfirmado(null);
                }}
                className="rounded-xl bg-white border border-zinc-200 text-zinc-700 text-[13px] font-medium px-4 py-2.5 hover:bg-zinc-50 transition-colors mr-2"
              >
                Nova cotação
              </button>
              <a
                href={`/os/${confirmado.os.id}`}
                className="rounded-xl bg-[#1E4C8C] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#173d70] transition-colors inline-block"
              >
                Ver detalhes da OS
              </a>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}