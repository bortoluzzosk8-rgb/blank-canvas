-- Adicionar política para franqueados gerenciarem motoristas da sua franquia
CREATE POLICY "Franqueado can manage drivers of own franchise" ON public.drivers
  FOR ALL USING (
    has_role(auth.uid(), 'franqueado') 
    AND franchise_id = get_user_franchise_id(auth.uid())
  );