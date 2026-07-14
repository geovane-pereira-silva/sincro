# CHANGELOG — SINCRO

> ⚠️ INSTRUÇÃO PARA O ASSISTENTE: Antes de qualquer implementação nova, leia este arquivo
> e os documentos em docs/funcionalidades/ para entender o que já existe.
> Nunca reimplemente o que já está feito. Sempre atualize este CHANGELOG ao final de cada sessão.

---

## [2026-07-14] — Correção: dias com batidas trocadas apareciam "Incompleto"

### Corrigido
- [ponto/relatório] `src/lib/ponto.ts` (`resumoDoDia`) — entrada/saída e
  intervalos passam a ser derivados da **ordem cronológica** das batidas, não
  do campo `tipo`. Assim, mesmo que os papéis estejam trocados (ex.: várias
  batidas salvas como "entrada"), o dia é calculado corretamente.
- [ponto/editor] `src/components/ponto-dia-editor.tsx` — o pré-preenchimento do
  editor mapeia as batidas existentes por posição cronológica (1ª = entrada,
  última = saída), corrigindo o caso em que tudo aparecia como "entrada".
- [dados] Migração normalizou o `tipo` de todas as batidas de todos os usuários
  com base na ordem cronológica de cada dia (nenhum horário foi alterado).


## [2026-07-14] — Correção: lembretes de ponto não disparavam

### Corrigido
- [notificações] `src/hooks/use-lembretes-ponto.ts` — quando o usuário nunca
  salvava preferências, `config` vinha `null` e o hook retornava cedo, não
  agendando **nenhum** lembrete. Agora usa `CONFIG_NOTIF_DEFAULT` como fallback,
  de modo que todo usuário logado (navegador ou app instalado) recebe lembretes.

### Adicionado
- [notificações] `src/lib/pushNotifications.ts` — `appInstalado()` detecta modo
  standalone (PWA instalado / iOS `navigator.standalone`).
- [notificações] Quando o app está **instalado**: pede permissão de notificação
  automaticamente e **força o lembrete como pop-up do sistema** (via Service
  Worker `showNotification`), além do toast. No navegador sem permissão, mantém
  o fallback de toast na tela.

---


## [2026-07-13] — BLOCO B3 (Apple SSO) + B7 (Web Push VAPID)

### Adicionado
- [auth] `src/routes/auth.tsx` — botão **Entrar com Apple** (via broker
  `lovable.auth.signInWithOAuth("apple")`), ao lado do Google. Provedor Apple
  habilitado no backend.
- [push] `src/lib/pushNotifications.ts` — `assinarWebPush`/`cancelarWebPush`
  (subscription do PushManager com a chave pública VAPID) e helper
  `urlBase64ToUint8Array`.
- [push] `src/lib/push.functions.ts` — server fns `salvarPushSubscription`
  (upsert) e `removerPushSubscription`, escopadas ao usuário autenticado.
- [push] Edge function `supabase/functions/send-push-notification` — envia
  Web Push (VAPID) para os dispositivos de um usuário; protegida por segredo
  interno (`x-internal-secret` / `PUSH_INTERNAL_SECRET`); remove subscriptions
  expiradas (404/410).

### Modificado
- [push] `src/components/config-notificacoes-form.tsx` — ao ativar as
  notificações push, o dispositivo é assinado no Web Push e a subscription é
  persistida; ao desativar, a subscription é cancelada e removida.

### Segredos
- `PUSH_INTERNAL_SECRET` (novo), além dos já existentes `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

### Limitações conhecidas
- **B3 Microsoft SSO:** o provedor Microsoft não é suportado pela autenticação
  gerenciada (apenas Google e Apple). Mantido apenas Google + Apple.
- Pendentes da sequência: B1 (Férias/Folgas), B2 (assinatura do espelho),
  B5 (QR Code), B6 (justificativa de HE) e Bloco C (visual).

---



## [2026-07-13] — UX: foco no ponto faltante + largura confortável no PC

### Modificado
- [ponto] `src/components/ponto-dia-editor.tsx` — ao abrir o editor de um dia,
  o primeiro campo **vazio** (ponto faltando) já vem selecionado, bastando
  digitar o horário. Se não houver campo vazio, foca a entrada.
- [layout] `src/components/app-shell.tsx` — em telas de note/PC o conteúdo
  passa a usar largura máxima confortável (`lg:max-w-5xl`) em vez da coluna
  estreita de celular, dando espaço ao espelho de ponto e tabelas.

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
