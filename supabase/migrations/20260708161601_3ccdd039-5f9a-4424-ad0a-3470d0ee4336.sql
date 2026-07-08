-- Empresa vinculada ao usuário logado (bypassa RLS para evitar recursão)
CREATE OR REPLACE FUNCTION public.empresa_do_usuario(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE id = _user_id
$$;

CREATE POLICY "gestor le sua empresa" ON public.empresas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') AND id = public.empresa_do_usuario(auth.uid()));

CREATE POLICY "gestor le setores da empresa" ON public.setores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') AND empresa_id = public.empresa_do_usuario(auth.uid()));

CREATE POLICY "gestor le colaboradores da empresa" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') AND empresa_id = public.empresa_do_usuario(auth.uid()));

CREATE POLICY "gestor le jornadas da empresa" ON public.jornadas_empresa
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') AND empresa_id = public.empresa_do_usuario(auth.uid()));

CREATE POLICY "gestor le colaborador_jornadas" ON public.colaborador_jornadas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor') AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaborador_jornadas.colaborador_id
        AND c.empresa_id = public.empresa_do_usuario(auth.uid())
    )
  );

CREATE POLICY "gestor le pontos dos colaboradores" ON public.ponto_registros
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor') AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.user_id = ponto_registros.user_id
        AND c.empresa_id = public.empresa_do_usuario(auth.uid())
    )
  );

CREATE POLICY "gestor le perfis dos colaboradores" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') AND empresa_id = public.empresa_do_usuario(auth.uid()));