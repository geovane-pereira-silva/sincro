# Changelog — SINCRO

Histórico cronológico das entregas relevantes. **Entrada mais recente no
topo.** Não apagar entradas antigas.

Formato:
```
## [DATA] — Título curto
- O que foi feito:
- Arquivos/componentes afetados:
- Por quê:
```

---

## [2026-07-10] — Correção dos lembretes de ponto no celular
- O que foi feito: Lembretes de ponto passaram a usar Service Worker
  (`public/sw.js`) e `registration.showNotification`, que funcionam no
  Android/Chrome (onde `new Notification()` é bloqueado). O agendamento deixou
  de depender de um único `setTimeout` (morto em segundo plano no celular) e
  agora usa um verificador em intervalo curto + `visibilitychange`, com janela
  de disparo e deduplicação por dia via localStorage. O toast na tela sempre
  aparece com o app aberto.
- Arquivos/componentes afetados: `public/sw.js`, `src/lib/pushNotifications.ts`,
  `src/hooks/use-lembretes-ponto.ts`.
- Por quê: A notificação de lembrete próxima ao horário de bater ponto não
  disparava, principalmente em dispositivos móveis.
  Observação: notificação com o app totalmente fechado exige Web Push
  (servidor + VAPID + cron), ainda não implementado.


## [2026-07-10] — Criação da documentação viva (/docs)
- O que foi feito: Estruturada a pasta `/docs` (01-sistema, 02-funcionalidades,
  changelog) documentando retroativamente o sistema e todos os módulos já
  implementados. Registrada a "regra de ouro" (ler /docs antes de agir).
- Arquivos/componentes afetados: `docs/README.md`, `docs/01-sistema/*`,
  `docs/02-funcionalidades/*`, `docs/changelog.md`.
- Por quê: Ter uma fonte única de verdade viva para evitar retrabalho e
  contradições em tarefas futuras.
- Observação: o pedido citava um portal de notícias ("Chip Notícias"); este
  repositório é o SINCRO (ponto eletrônico). A documentação reflete o SINCRO.

## [2026-07] — Fase 1: Solicitações, Geolocalização e Notificações
- O que foi feito: Tabelas `solicitacoes`, `notificacoes`,
  `empresa_localizacao`, `config_notificacoes`, `dias_especiais` com RLS/GRANTs;
  bucket privado `anexos-solicitacoes`; libs de geolocalização (Haversine, GPS,
  geocoding) e push local; fluxo de solicitações em 3 passos com anexo;
  aprovação/rejeição pelo gestor com atualização de ponto/dias especiais;
  sino de notificações em tempo real; geofencing na batida; lembretes locais.
- Arquivos/componentes afetados: `src/lib/{geolocalizacao,pushNotifications,
  solicitacoes,notificacoes,solicitacoes-actions.functions}.ts`,
  `src/hooks/use-{notificacoes,solicitacoes,config-notificacoes,
  empresa-localizacao,lembretes-ponto}.ts`, `src/components/{notificacoes-bell,
  config-notificacoes-form,nova-solicitacao-dialog,leaflet-map}.tsx`,
  rotas `solicitacoes.tsx`, `gestor.solicitacoes.tsx`, `gestor.configuracoes.tsx`,
  `ponto.tsx`, `app-shell.tsx`.
- Por quê: Adicionar fluxo de exceções de jornada, validação de localização e
  comunicação em tempo real sem tocar em autônomo/financeiro/pagamento.

## [2026-07] — Remoção de branding da plataforma de build
- O que foi feito: Removida telemetria e identidade visual/metadados da
  plataforma; garantida marca 100% SINCRO.
- Arquivos/componentes afetados: `src/routes/__root.tsx`,
  `public/manifest.json`, CSS, remoção de reporter de erro.
- Por quê: Produto final deve exibir apenas a marca SINCRO.

## [2026-07] — Ordenação automática de pontos
- O que foi feito: Ao salvar, pontos são ordenados cronologicamente e os
  papéis (entrada/intervalo/saída) reatribuídos, mesmo com entrada/saída
  invertidas.
- Arquivos/componentes afetados: `src/components/ponto-dia-editor.tsx`.
- Por quê: Evitar erros de sequência causados por batidas fora de ordem.

## [2026-07] — Espelho de ponto com múltiplas batidas
- O que foi feito: Suporte a pares de batidas ilimitados (4 padrão, até 10);
  colunas dinâmicas no relatório; botão "Adicionar intervalo" no editor.
- Arquivos/componentes afetados: `src/lib/ponto.ts`,
  `src/routes/_authenticated/relatorio.tsx`, `src/components/ponto-dia-editor.tsx`.
- Por quê: Jornadas reais têm mais de 2 batidas por dia.

## [2026-07] — Jornada calculada até o dia atual
- O que foi feito: Introduzido status `futuro`; dias após a data atual retornam
  0 (sem falta/saldo negativo).
- Arquivos/componentes afetados: `src/lib/calculoTrabalhista.ts`.
- Por quê: Dias que ainda não ocorreram não devem penalizar o saldo.

## [2026-07] — Edição manual de ponto e relatório responsivo
- O que foi feito: Editor de dia para autônomos (adicionar/editar pontos);
  relatório com tabela clicável no desktop e cards no mobile.
- Arquivos/componentes afetados: `src/components/ponto-dia-editor.tsx`,
  `src/routes/_authenticated/relatorio.tsx`.
- Por quê: Melhor UX conforme o dispositivo e autonomia para autônomos.

## [2026-06/07] — Portal do Gestor, auditoria, webhook e exportação
- O que foi feito: Papel `gestor` com escopo por RLS e dashboard `/gestor`;
  geração automática de usuário-gestor ao criar empresa; `/admin/auditoria`
  com exportação; `/admin/webhook` (teste Asaas) com logs persistentes;
  `/admin/exportar` com CSV/PDF; redirecionamento `/ponto` → `/gestor`.
- Arquivos/componentes afetados: `src/lib/{empresas-actions,gestor-admin,
  asaas-webhook}.functions.ts`, `src/lib/pdf-export.ts`, rotas admin/gestor,
  tabela `asaas_webhook_eventos`.
- Por quê: Habilitar gestão por empresa e ferramentas administrativas.

## [2026-06] — Recursos admin e limpeza de usuários de teste
- O que foi feito: `/admin/recursos` com URLs de webhook, links de
  documentação e gestão de superadmins; removidos usuários de teste, mantendo
  Geovane Pereira como admin master; correção dos pontos de teste do Geovane.
- Arquivos/componentes afetados: `src/routes/_authenticated/admin/recursos.index.tsx`,
  `admin-shell.tsx`, dados de ponto do Geovane.
- Por quê: Preparar ambiente para produção com um admin master real.

## [2026-06] — Convites, vínculo colaborador↔perfil e fluxo de aceite
- O que foi feito: Envio de convite via Edge Function/Resend (fallback copia
  link); coluna `colaboradores.user_id` + trigger `handle_new_user`; filtros de
  status na aba Colaboradores; histórico de convites com CSV; reenvio com novo
  token; página `/convite/$token` com stepper e estados de erro; onboarding
  diferenciado por tipo de conta.
- Arquivos/componentes afetados: `src/lib/{email.server,convite.functions,
  cadastro.functions}.ts`, `src/components/{colaborador-dialog,
  convite-colaborador-dialog,onboarding-screen}.tsx`, `src/routes/convite.$token.tsx`.
- Por quê: Onboarding completo de colaboradores por empresa.

## [inicial] — Base do sistema de ponto eletrônico
- O que foi feito: Autenticação (email/senha, reset), perfis/roles, marcação de
  ponto, cálculo trabalhista, relatórios/histórico, cadastro de empresas e
  colaboradores, planos/assinaturas Asaas, painel admin.
- Arquivos/componentes afetados: `src/routes/*`, `src/lib/*`, `src/hooks/*`,
  integração Supabase.
- Por quê: Entregar o núcleo do produto SINCRO.
