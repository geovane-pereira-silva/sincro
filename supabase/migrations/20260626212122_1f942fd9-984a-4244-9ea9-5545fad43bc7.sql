-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('superadmin', 'user');

-- 2. Tabela de papéis (separada de profiles por segurança)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função security definer para checar papel (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Políticas de user_roles
CREATE POLICY "usuario le proprio papel"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "superadmin le todos os papeis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- 5. Políticas de leitura admin (somam-se às existentes via OR)
CREATE POLICY "superadmin le todos os perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin le todos os registros"
ON public.ponto_registros
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin le todo premium"
ON public.premium_access
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- 6. Superadmin pode conceder e revogar premium
CREATE POLICY "superadmin concede premium"
ON public.premium_access
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin revoga premium"
ON public.premium_access
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));