-- Remover políticas antigas que só permitem admin
DROP POLICY IF EXISTS "Only admins can insert settings" ON settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON settings;

-- Criar novas políticas que incluem franqueadora
CREATE POLICY "Admins and franqueadora can insert settings" ON settings
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'franqueadora'::app_role)
  );

CREATE POLICY "Admins and franqueadora can update settings" ON settings
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'franqueadora'::app_role)
  );