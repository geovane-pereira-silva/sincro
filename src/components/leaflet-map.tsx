import { useEffect, useRef } from "react";

// Carrega Leaflet via CDN sob demanda (sem dependência no bundle).
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L?: any;
  }
}

let carregando: Promise<void> | null = null;

function carregarLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();
  if (carregando) return carregando;

  carregando = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Leaflet"));
    document.head.appendChild(script);
  });
  return carregando;
}

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  raioMetros?: number;
  className?: string;
  zoom?: number;
}

export function LeafletMap({
  latitude,
  longitude,
  raioMetros,
  className,
  zoom = 16,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let ativo = true;
    carregarLeaflet().then(() => {
      if (!ativo || !containerRef.current || !window.L) return;
      const L = window.L;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView(
          [latitude, longitude],
          zoom,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([latitude, longitude], zoom);
      }

      // Limpa camadas anteriores.
      layersRef.current.forEach((l) => mapRef.current.removeLayer(l));
      layersRef.current = [];

      const marker = L.marker([latitude, longitude]).addTo(mapRef.current);
      layersRef.current.push(marker);

      if (raioMetros && raioMetros > 0) {
        const circle = L.circle([latitude, longitude], {
          radius: raioMetros,
          color: "#0f2b60",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
        }).addTo(mapRef.current);
        layersRef.current.push(circle);
      }

      // Corrige renderização em containers que mudaram de tamanho.
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    });

    return () => {
      ativo = false;
    };
  }, [latitude, longitude, raioMetros, zoom]);

  // Destrói o mapa ao desmontar.
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: 200, borderRadius: 12, overflow: "hidden" }}
    />
  );
}
