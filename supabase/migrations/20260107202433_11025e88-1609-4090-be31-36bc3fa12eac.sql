-- Criar política para motoristas visualizarem sale_items
CREATE POLICY "Motorista can view all sale_items"
ON public.sale_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'motorista'::app_role));