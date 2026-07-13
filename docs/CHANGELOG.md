# CHANGELOG — SINCRO

> ⚠️ INSTRUÇÃO PARA O ASSISTENTE: Antes de qualquer implementação nova, leia este arquivo
> e os documentos em docs/funcionalidades/ para entender o que já existe.
> Nunca reimplemente o que já está feito. Sempre atualize este CHANGELOG ao final de cada sessão.

---

## [2026-07-13] — BLOCO B4: Ponto Offline (integrado à tela de ponto)

### Adicionado
- [ponto offline] `src/lib/pontoOffline.ts` — fila de batidas em IndexedDB,
  detecção de erro de rede (`isErroDeRede`), sincronização automática e
  Background Sync via Service Worker.
- [ponto offline] `src/hooks/use-ponto-offline.ts` — estado de conexão,
  contagem de pendentes e sincronização nos eventos `online`/montagem.
- [ponto offline] `src/components/offline-indicator.tsx` — selo Online /
  Offline / Sincronizando com contador de pendentes no card do relógio.

### Modificado
- [ponto] `src/routes/_authenticated/ponto.tsx` — ao bater ponto sem conexão,
  o registro é salvo localmente (toast informando) e sincronizado quando a
  rede volta; indicador de conexão exibido no card do relógio.

### Banco de dados
- Nenhuma alteração (usa a estrutura existente de `ponto_registros`).

---

## [2026-07-13] — Documentação viva (nova estrutura /docs) + roadmap BLOCO B/C

### Adicionado
- [docs] Nova árvore de documentação: `docs/sistema/`, `docs/funcionalidades/`
  (autonomo, colaborador, gestor, admin), `docs/modulos/` e este `CHANGELOG.md`.
- [docs] Template padronizado por funcionalidade/módulo.

### Modificado
- [docs] Documentação retroativa consolidada nesta nova estrutura.

### Banco de dados
- Nenhuma alteração nesta etapa (BLOCO A).

### Limitações conhecidas
- BLOCO B (Férias/Folgas, Assinatura de espelho, SSO Microsoft/Apple, Ponto
  offline, QR Code, Justificativa de HE, Push VAPID) — PENDENTE.
- BLOCO C (upgrades visuais "produto sério") — PENDENTE.

---

## [2026-07-10] — Lembretes de ponto no celular
### Corrigido
- [bug] Lembretes passaram a usar Service Worker (`public/sw.js`) e
  `showNotification`, com verificador de intervalo curto + `visibilitychange`,
  janela de disparo e deduplicação por dia (localStorage).
### Limitações conhecidas
- Push com app totalmente fechado exige Web Push (VAPID + cron) — não implementado.

## [2026-07] — Fase 1: Solicitações, Geolocalização e Notificações
### Adicionado
- [feature] Solicitações (modal 3 passos, anexo), aprovação/rejeição do gestor.
- [feature] Geolocalização/geofencing na batida; lembretes locais; sino realtime.
### Banco de dados
- [migration] `solicitacoes`, `notificacoes`, `empresa_localizacao`,
  `config_notificacoes`, `dias_especiais`; bucket `anexos-solicitacoes`.

## [2026-07] — Remoção de branding da plataforma de build
### Removido
- [feature] Telemetria e identidade visual/metadados da plataforma; marca 100% SINCRO.

## [2026-07] — Espelho multi-batidas, ordenação, dias futuros, edição manual
### Adicionado
- [feature] Suporte a batidas ilimitadas (4 padrão, até 10); colunas dinâmicas.
- [feature] Editor de dia para autônomos; relatório responsivo (tabela/cards).
### Modificado
- [feature] Ordenação automática de pontos com reatribuição de papéis.
- [feature] Status `futuro`: dias após hoje não geram falta/negativo.

## [2026-06/07] — Portal do Gestor, auditoria, webhook e exportação
### Adicionado
- [feature] Papel `gestor` com RLS e `/gestor`; geração automática de gestor.
- [feature] `/admin/auditoria`, `/admin/webhook` (teste Asaas), `/admin/exportar`.
### Banco de dados
- [migration] `asaas_webhook_eventos`.

## [2026-06] — Recursos admin e limpeza de usuários de teste
### Adicionado
- [feature] `/admin/recursos` (URLs de webhook, docs, superadmins).
### Removido
- [feature] Usuários de teste (mantido Geovane Pereira como admin master).

## [2026-06] — Convites e vínculo colaborador↔perfil
### Adicionado
- [feature] Convite via Edge/Resend (fallback link); `/convite/$token` com stepper.
- [feature] Filtros de status, histórico de convites (CSV), reenvio com novo token.
### Banco de dados
- [migration] `colaboradores.user_id` + trigger `handle_new_user`.

## [inicial] — Base do sistema
### Adicionado
- [feature] Autenticação/perfis, marcação de ponto, cálculo trabalhista,
  relatórios/histórico, empresas/colaboradores, planos/assinaturas Asaas, admin.
