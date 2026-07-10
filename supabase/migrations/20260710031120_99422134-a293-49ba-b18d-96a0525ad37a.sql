-- Upload: usuário grava na própria pasta {uid}/...
CREATE POLICY "anexos_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos-solicitacoes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura: dono do arquivo
CREATE POLICY "anexos_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anexos-solicitacoes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura: gestores e superadmins
CREATE POLICY "anexos_select_gestor" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos-solicitacoes'
    AND (SELECT tipo_conta FROM public.profiles WHERE id = auth.uid()) IN ('gestor','superadmin')
  );

-- Remoção: dono do arquivo (solicitação cancelada)
CREATE POLICY "anexos_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anexos-solicitacoes' AND (storage.foldername(name))[1] = auth.uid()::text);