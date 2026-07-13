# Módulo: Notificações Push

## O que é
Sistema de notificações e lembretes: in-app em tempo real e lembretes locais de
ponto; push com app fechado planejado.

## Como funciona
1. Notificações in-app via Supabase Realtime + fallback polling.
2. Lembretes locais agendados por Service Worker (`showNotification`).
3. (Planejado) Web Push com VAPID para app totalmente fechado.

## Quem usa
Todos os tipos de conta.

## Regras de negócio
- Lembretes baseados na jornada e nas preferências do usuário.
- Deduplicação por dia via localStorage.

## Tabelas do banco envolvidas
`notificacoes`, `config_notificacoes`; (BLOCO B7) `push_subscriptions` —
PENDENTE.

## Rotas do sistema
Sino no header; `/configuracoes`.

## Configurações
Horários, antecedência (5/10/15/30 min), push on/off.

## Observações técnicas
`public/sw.js`, `src/lib/pushNotifications.ts`; hooks `use-notificacoes`,
`use-lembretes-ponto`. Web Push (VAPID + Edge Function) ainda não implementado.
