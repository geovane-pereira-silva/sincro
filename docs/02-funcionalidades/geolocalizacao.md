# Geolocalização (Geofencing)

## O que é
Validação opcional da localização do colaborador no momento da batida,
garantindo que o ponto seja registrado dentro do perímetro da empresa.

## O que ele faz
- Captura GPS do navegador e calcula distância até a empresa (Haversine).
- Gestor define endereço/coordenadas, raio (m) e se a localização é
  **exigida**, com mapa interativo e círculo de perímetro.
- Na batida, colaboradores têm a localização validada; a distância é
  registrada para auditoria.

## Como funciona
- Lógica: `src/lib/geolocalizacao.ts` (Haversine, GPS, geocoding via
  Nominatim), função `validarLocalizacaoPonto`.
- UI: `src/components/leaflet-map.tsx` (Leaflet via CDN),
  `gestor.configuracoes.tsx`.
- Hook: `use-empresa-localizacao`.
- Tabela: `empresa_localizacao`; campos em `ponto_registros`
  (`latitude`, `longitude`, `distancia_empresa_metros`).

## Dependências
- Depende de: empresas-gestor.
- Integrado em: ponto (bloqueia/permite batida conforme distância).

## Status
Em produção.
