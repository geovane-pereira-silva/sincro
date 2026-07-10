# Visão Geral — SINCRO

## O que é
SINCRO é um sistema web de **ponto eletrônico e gestão de jornada de
trabalho**. Ele permite registrar entradas, saídas e intervalos, calcular
saldo de horas, gerar espelhos de ponto/relatórios e administrar empresas,
gestores e colaboradores em um modelo SaaS.

## Público-alvo
- **Trabalhadores autônomos / individuais** que precisam controlar a própria
  jornada e emitir relatórios.
- **Empresas** que precisam gerir a jornada de seus colaboradores, com um
  usuário-gestor por empresa.
- **Colaboradores** vinculados a uma empresa, que batem ponto e abrem
  solicitações (ajustes, abonos, férias, etc.).
- **Administrador master (superadmin)** — o criador do sistema, que gerencia
  empresas, usuários, financeiro, webhooks e auditoria.

## Objetivo do produto
Oferecer um controle de ponto simples e responsivo (uso em celular e desktop),
com cálculo trabalhista correto (saldo, faltas, dias futuros não penalizados),
fluxo de solicitações com aprovação do gestor, geofencing opcional por empresa,
notificações/lembretes e monetização via assinaturas (Asaas).

## Perfis de acesso (tipo_conta)
- **autônomo / individual** — controla a própria jornada, pode inserir/editar
  pontos manualmente no relatório.
- **colaborador** — vinculado a uma empresa; bate ponto e abre solicitações.
- **gestor** — gerencia colaboradores de sua empresa, aprova solicitações,
  configura geolocalização; acessa `/gestor`.
- **admin / superadmin (admin master)** — Geovane Pereira é o admin master
  inicial; pode criar outros admins. Acessa `/admin`.

## Marca
O produto se chama **SINCRO**. Toda a identidade visual e metadados são
próprios (a marca da plataforma de build foi removida do produto final).

## Status geral
Em produção, com evolução contínua. Ver `/docs/changelog.md`.
