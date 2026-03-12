-- Permitir que vendedores gerenciem monitores de todas as unidades
CREATE POLICY "Vendedor pode gerenciar monitores"
  ON public.monitors
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));