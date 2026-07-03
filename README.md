# SINCRO — Seu tempo, seu controle.

Controle de jornada para autônomos, freelancers e MEIs. Registre entradas,
intervalos e saídas de forma simples, acompanhe seu histórico, gere relatórios
mensais (CSV) e mantenha o controle do seu tempo — no seu ritmo.

---

## Stack técnica

- **React 19** + **TypeScript**
- **TanStack Start** (SSR) + **TanStack Router** (roteamento por arquivos) + **TanStack Query**
- **Tailwind CSS v4** (design tokens em `src/styles.css`)
- **shadcn/ui** + **lucide-react**
- **Supabase** (Lovable Cloud) — Postgres, Auth e RLS
- **Vite** como bundler

---

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# preencha VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e VITE_SUPABASE_PROJECT_ID

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

O app sobe em `http://localhost:8080`.

### Variáveis de ambiente

Veja `.env.example`. As chaves usadas pelo front-end são **públicas**
(anon/publishable) e protegidas por Row Level Security no banco.

| Variável | Descrição |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) — segura no front-end |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `VITE_APP_URL` | URL pública do app (ex.: `https://sincro.app`) |
| `VITE_APP_NAME` | Nome do app (`SINCRO`) |

---

## Estrutura de pastas

```
public/                 Assets estáticos (manifest, ícones, robots, sitemap)
src/
├─ routes/              Rotas (file-based routing do TanStack Router)
│  ├─ __root.tsx        Shell raiz: <head>, providers, meta/SEO
│  ├─ index.tsx         "/" → redireciona para /ponto
│  ├─ auth.tsx          Login / cadastro / recuperação
│  ├─ ref.$code.tsx     Links de indicação (/ref/CODE)
│  └─ _authenticated/   Rotas protegidas (ponto, histórico, relatório,
│                        configurações e painel /admin)
├─ components/          Componentes de UI (app-shell, admin, premium, ui/*)
├─ hooks/               Hooks (auth, perfil, registros, premium, admin)
├─ lib/                 Regras de negócio (ponto, premium, erros, utils)
└─ integrations/
   └─ supabase/         Cliente Supabase e tipos gerados
```

---

## Build e deploy

```bash
# Build de produção
npm run build

# Pré-visualizar o build localmente
npm run preview
```

O build gera a saída em `dist/`. O deploy no Lovable é feito pelo botão
**Publish**. Para deploy próprio, sirva o build de SSR gerado e configure as
mesmas variáveis de ambiente do `.env.example` no ambiente de produção.

> Alterações de **frontend** exigem clicar em "Update" no diálogo de publicação.
> Alterações de **backend** (migrations, funções) são aplicadas automaticamente.

---

## Criando o superadmin

Os papéis ficam na tabela `user_roles` (enum `app_role`), separada de `profiles`,
e são verificados via a função `has_role` (SECURITY DEFINER). Para promover um
usuário a superadmin, insira um registro em `user_roles` para o `user_id` da
conta (obtido em `auth.users` pelo e-mail):

```sql
insert into public.user_roles (user_id, role)
select id, 'superadmin'
from auth.users
where email = 'email-do-admin@exemplo.com'
on conflict (user_id, role) do nothing;
```

Após isso, a conta passa a ter acesso ao painel em `/admin`. Usuários sem o
papel são redirecionados para `/ponto`.

---

## Segurança

- **RLS ativo** em `profiles`, `ponto_registros`, `premium_access` e `user_roles`.
- Papéis armazenados em tabela dedicada (`user_roles`) — nunca no perfil.
- Rotas autenticadas redirecionam para `/auth` quando não há sessão.
- `/admin` redireciona para `/ponto` quando o usuário não é superadmin.
- Apenas chaves **públicas** ficam no front-end; nenhuma chave privada no código.
