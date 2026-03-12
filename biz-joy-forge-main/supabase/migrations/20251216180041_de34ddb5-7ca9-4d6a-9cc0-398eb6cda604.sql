-- Remover políticas antigas do bucket payment-receipts
DROP POLICY IF EXISTS "Users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete payment receipts" ON storage.objects;

-- Nova política de INSERT que inclui vendedores
CREATE POLICY "Users can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (
    -- Admin (franqueadora)
    public.has_role(auth.uid(), 'franqueadora'::public.app_role) OR
    -- Franqueados
    EXISTS (
      SELECT 1 FROM public.user_franchises WHERE user_id = auth.uid()
    ) OR
    -- Vendedores
    public.has_role(auth.uid(), 'vendedor'::public.app_role)
  )
);

-- Nova política de SELECT que inclui vendedores
CREATE POLICY "Users can view payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'franqueadora'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_franchises WHERE user_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'vendedor'::public.app_role)
  )
);

-- Nova política de DELETE que inclui vendedores
CREATE POLICY "Users can delete payment receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'franqueadora'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_franchises WHERE user_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'vendedor'::public.app_role)
  )
);