// Geolocalização de ponto — funções puras + integração leve com Nominatim.
// Sem bibliotecas externas: distância via fórmula de Haversine.

import { supabase } from "@/integrations/supabase/client";

export type GeoErro = "sem_permissao" | "fora_da_area" | "timeout" | "sem_gps";

export interface PontoGeoResult {
  permitido: boolean;
  latitude?: number;
  longitude?: number;
  distancia_metros?: number;
  erro?: GeoErro;
}

export interface EmpresaLocalizacao {
  endereco: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  exigir_localizacao: boolean;
}

/** Distância em metros entre dois pontos (Haversine). */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // raio da Terra em metros
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Lê a posição atual do navegador (promise-based sobre a API de geolocalização). */
export function obterPosicaoAtual(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("sem_gps"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });
}

function mapearErroGeo(err: unknown): GeoErro {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as GeolocationPositionError).code;
    if (code === 1) return "sem_permissao";
    if (code === 3) return "timeout";
    return "sem_gps";
  }
  return "sem_gps";
}

/**
 * Valida a localização do usuário contra a área da empresa.
 * Retorna sempre lat/lon quando o GPS respondeu, para permitir salvar no ponto.
 */
export async function validarLocalizacaoPonto(
  empresaId: string,
): Promise<PontoGeoResult> {
  const { data: loc, error } = await supabase
    .from("empresa_localizacao")
    .select("latitude, longitude, raio_metros, exigir_localizacao")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  // Sem configuração de localização: permite e não captura GPS.
  if (error || !loc) return { permitido: true };

  let pos: GeolocationPosition;
  try {
    pos = await obterPosicaoAtual();
  } catch (e) {
    const erro = mapearErroGeo(e);
    // Se a empresa não exige localização, não bloqueia mesmo sem GPS.
    return { permitido: !loc.exigir_localizacao, erro };
  }

  const latitude = pos.coords.latitude;
  const longitude = pos.coords.longitude;
  const distancia = calcularDistanciaMetros(
    latitude,
    longitude,
    Number(loc.latitude),
    Number(loc.longitude),
  );

  const dentro = distancia <= loc.raio_metros;
  const permitido = dentro || !loc.exigir_localizacao;

  return {
    permitido,
    latitude,
    longitude,
    distancia_metros: distancia,
    erro: permitido ? undefined : "fora_da_area",
  };
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  endereco_formatado: string;
}

/** Geocodifica um endereço via Nominatim (OpenStreetMap, sem API key). */
export async function geocodificarEndereco(
  endereco: string,
): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    endereco,
  )}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR" },
  });
  if (!res.ok) return null;
  const data: Array<{ lat: string; lon: string; display_name: string }> =
    await res.json();
  if (!data.length) return null;
  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
    endereco_formatado: data[0].display_name,
  };
}
