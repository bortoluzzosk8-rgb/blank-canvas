-- Remover políticas antigas
DROP POLICY IF EXISTS "Only admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;

-- Criar novas políticas
CREATE POLICY "Franqueadora and super_admin can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franqueadora and super_admin can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franqueadora and super_admin can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);