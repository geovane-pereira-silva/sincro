# Módulo: Geolocalização (Geofencing)

## O que é
Validação da localização do colaborador no momento da batida, com base na
posição e no raio configurados pela empresa.

## Como funciona
1. Empresa define coordenadas e raio no mapa (Leaflet).
2. Na batida, captura-se o GPS do dispositivo.
3. Calcula-se a distância (Haversine); fora do raio, a batida é bloqueada.

## Quem usa
Colaborador (validação); gestor (configuração).

## Regras de negócio
- Geofencing é opcional por empresa.
- Distância registrada em `ponto_registros` para auditoria.

## Tabelas do banco envolvidas
`empresa_localizacao`, `ponto_registros`.

## Rotas do sistema
`/gestor/configuracoes` (setup), `/ponto` (validação).

## Configurações
Coordenadas, raio, geocoding via Nominatim.

## Observações técnicas
`src/lib/geolocalizacao.ts` (Haversine, GPS, geocoding);
`leaflet-map.tsx`; hook `use-empresa-localizacao`.
