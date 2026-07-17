"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { dataHoraCompleta, type PosicaoVeiculo } from "./page";

function corPorStatus(v: PosicaoVeiculo): string {
  if (!v.motorLigado) return "#A1A1AA";
  return Number(v.velocidade) > 5 ? "#16A34A" : "#D97706";
}

function CentralizarSelecionado({ veiculos, selecionado }: { veiculos: PosicaoVeiculo[]; selecionado: string | null }) {
  const map = useMap();
  const primeiraCarga = useRef(true);

  useEffect(() => {
    if (selecionado) {
      const v = veiculos.find((x) => x.id === selecionado);
      if (v && v.latitude !== null && v.longitude !== null) {
        map.flyTo([v.latitude, v.longitude], 14, { duration: 0.6 });
      }
      return;
    }
    if (primeiraCarga.current && veiculos.length > 0) {
      primeiraCarga.current = false;
      const pontos = veiculos
        .filter((v) => v.latitude !== null && v.longitude !== null)
        .map((v) => [v.latitude as number, v.longitude as number] as [number, number]);
      if (pontos.length === 1) {
        map.setView(pontos[0], 13);
      } else if (pontos.length > 1) {
        map.fitBounds(pontos, { padding: [40, 40] });
      }
    }
  }, [selecionado, veiculos, map]);

  return null;
}

export default function MapaVeiculos({
  veiculos,
  selecionado,
  onSelecionar,
}: {
  veiculos: PosicaoVeiculo[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}) {
  const centroInicial: [number, number] = [-27.1, -52.5]; // Quilombo/SC, região da frota

  return (
    <div className="h-[560px] rounded-2xl border border-zinc-200 overflow-hidden">
      <MapContainer center={centroInicial} zoom={9} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CentralizarSelecionado veiculos={veiculos} selecionado={selecionado} />
        {veiculos.map((v) =>
          v.latitude !== null && v.longitude !== null ? (
            <CircleMarker
              key={v.id}
              center={[v.latitude, v.longitude]}
              radius={selecionado === v.id ? 10 : 7}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: corPorStatus(v),
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => onSelecionar(v.id) }}
            >
              <Popup>
                <div style={{ fontSize: 13 }}>
                  <strong>{v.placa}</strong>
                  <br />
                  {v.marca} {v.modelo}
                  <br />
                  {v.motorLigado ? `${Math.round(Number(v.velocidade) || 0)} km/h` : "motor desligado"}
                  <br />
                  <span style={{ color: "#71717A" }}>
                    Atualizado em {dataHoraCompleta(v.atualizadoEm)}
                    {v.fonte && ` · ${v.fonte}`}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ) : null,
        )}
      </MapContainer>
    </div>
  );
}
