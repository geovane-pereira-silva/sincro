# Visão Geral — SINCRO

## O que é
SINCRO é um sistema web de **ponto eletrônico e gestão de jornada de trabalho**
em modelo SaaS. Registra entradas, saídas e intervalos, calcula saldo de horas,
gera espelhos de ponto/relatórios e administra empresas, gestores e
colaboradores. Resolve o problema de controle de jornada tanto para autônomos
quanto para empresas com equipes.

## Como funciona
O usuário se cadastra com um `tipo_conta` (autônomo, colaborador ou gestor);
o admin master gerencia todo o sistema. Autônomos controlam a própria jornada e
editam pontos diretamente. Colaboradores batem ponto conforme as regras da
empresa e abrem solicitações que o gestor aprova. O motor trabalhista calcula
saldo, faltas e status do dia (dias futuros não penalizam).

## Quem usa
- **Autônomo / individual** — controla e edita a própria jornada.
- **Colaborador** — vinculado a uma empresa; bate ponto e abre solicitações.
- **Gestor** — administra a equipe da empresa, aprova solicitações, configura
  geofencing e regras de ponto.
- **Superadmin (admin master)** — o criador do sistema (Geovane Pereira);
  gerencia empresas, usuários, financeiro, webhooks e auditoria.

## Regras de negócio
- Autônomo **nunca** tem fluxo de aprovação — edita tudo direto.
- Colaborador segue as regras configuradas pela empresa.
- Dias futuros retornam saldo 0 (não geram falta/negativo).
- Papéis administrativos ficam em tabela separada (`user_roles`), nunca no perfil.

## Tabelas do banco envolvidas
`profiles`, `user_roles`, `empresas`, `colaboradores`, `ponto_registros`,
`solicitacoes`, `dias_especiais`, `assinaturas`, `user_plans`.

## Rotas do sistema
`/` (landing), `/auth`, `/ponto`, `/relatorio`, `/historico`, `/solicitacoes`,
`/gestor`, `/admin/*`.

## Configurações
Tipo de conta no cadastro; jornada por usuário/empresa; regras de ponto e
geofencing por empresa (gestor); planos/assinaturas (admin).

## Observações técnicas
Produto 100% marca SINCRO. Evolução contínua registrada em `docs/CHANGELOG.md`.
