# Configurações da Empresa — Gestor

## O que é
Ajustes da empresa controlados pelo gestor: geolocalização (geofencing), regras
de ponto e demais políticas.

## Como funciona
1. Gestor acessa `/gestor/configuracoes`.
2. Define a localização/raio da empresa (geofencing) via mapa.
3. Configura regras de ponto (ex.: exigir justificativa de HE).

## Quem usa
Gestor.

## Regras de negócio
- Geofencing valida a distância na batida do colaborador.
- (BLOCO B) QR Code de ponto e toggle de ponto offline — PENDENTES.

## Tabelas do banco envolvidas
`empresa_localizacao`, `empresas`, `jornadas_empresa`.

## Rotas do sistema
`/gestor/configuracoes`.

## Configurações
Coordenadas/raio, regras de ponto, geofencing on/off.

## Observações técnicas
`leaflet-map.tsx`; hook `use-empresa-localizacao`;
`src/lib/geolocalizacao.ts`.
