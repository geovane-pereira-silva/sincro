# Sistema de Marcação de Ponto Eletrônico

## Visão Geral
Sistema web completo para registro eletrônico de ponto de funcionários, com controle de jornada, relatórios e gestão administrativa.

## Funcionalidades Principais

### 1. Autenticação e Perfis
- Login com email/senha
- Recuperação de senha
- Três perfis de acesso: **Funcionário**, **Gestor** e **Administrador**
- Cadastro e gerenciamento de usuários (admin)

### 2. Marcação de Ponto (Funcionário)
- Botão único para registrar entrada, saída, início e fim de intervalo
- Registro automático de data/hora e localização (geolocalização)
- Histórico pessoal de marcações
- Edição solicitada com justificativa (sujeita a aprovação)

### 3. Painel Administrativo (Gestor/Admin)
- Dashboard com visão geral da equipe
- Lista de funcionários e suas marcações do dia
- Aprovação/rejeição de solicitações de edição
- Cadastro de feriados e dias não úteis
- Configuração de horários de trabalho por funcionário

### 4. Relatórios
- Relatório mensal por funcionário (horas trabalhadas, atrasos, extras)
- Exportação para PDF e Excel
- Filtros por período, departamento e funcionário

### 5. Banco de Dados
Tabelas principais:
- `users` (autenticação)
- `profiles` (dados dos funcionários)
- `user_roles` (papéis: admin, gestor, funcionario)
- `time_entries` (registros de ponto)
- `edit_requests` (solicitações de correção)
- `work_schedules` (escalas/horários)
- `holidays` (feriados)

## Arquitetura Técnica

### Frontend
- React 19 + TanStack Start (SSR/SSG)
- TanStack Query para gerenciamento de dados
- Tailwind CSS + shadcn/ui para interface
- Responsivo (desktop e mobile)

### Backend
- Server Functions (TanStack Start) para lógica de negócio
- Backend (PostgreSQL + Auth)
- RLS (Row Level Security) para proteção de dados

### Estrutura de Rotas
```
/                    → Landing page / Login
/auth                → Página de autenticação
/dashboard           → Painel do funcionário (marcação de ponto)
/history             → Histórico pessoal de marcações
/admin               → Painel administrativo
/admin/employees     → Gestão de funcionários
/admin/reports       → Relatórios
/admin/settings      → Configurações (horários, feriados)
```

## Design Visual
- Tema clean e profissional
- Cores sóbrias (azul escuro como primária)
- Cards informativos no dashboard
- Ícones claros para ações de ponto
- Layout adaptável para uso em celular (importante para marcação no dispositivo móvel)

## Requisitos de Aprovação
Preciso da sua confirmação para:
1. Proseguir com a implementação completa conforme descrito acima
2. Habilitar o backend (banco de dados e autenticação)
3. Ajustar ou remover funcionalidades que não sejam necessárias

**Aguardo sua aprovação para começar.**