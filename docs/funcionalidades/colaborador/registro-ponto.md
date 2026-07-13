# Registro de Ponto — Colaborador

## O que é
Marcação de ponto do colaborador vinculado a uma empresa, sujeita às regras
configuradas pelo gestor (ex.: geofencing).

## Como funciona
1. Colaborador acessa `/ponto` e registra a batida.
2. Se a empresa exige geolocalização, o sistema valida a posição
   (`validarLocalizacaoPonto`) antes de inserir.
3. Ajustes fora do padrão passam por solicitação e aprovação do gestor.

## Quem usa
Colaborador.

## Regras de negócio
- Segue as regras da empresa (geofencing, justificativa de HE, etc.).
- Correções de ponto exigem solicitação aprovada pelo gestor (sem edição direta).

## Tabelas do banco envolvidas
`ponto_registros`, `empresa_localizacao`, `colaboradores`, `jornadas_empresa`.

## Rotas do sistema
`/ponto`, `/relatorio`.

## Configurações
Geofencing e regras de ponto definidos pelo gestor em `/gestor/configuracoes`.

## Observações técnicas
Validação de localização em `src/lib/geolocalizacao.ts`; batida em
`src/routes/_authenticated/ponto.tsx`.
