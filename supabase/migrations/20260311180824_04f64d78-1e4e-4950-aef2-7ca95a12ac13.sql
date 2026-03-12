CREATE POLICY "Franqueadora can delete clients without franchise"
ON public.clients FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'franqueadora'::app_role) AND franchise_id IS NULL);