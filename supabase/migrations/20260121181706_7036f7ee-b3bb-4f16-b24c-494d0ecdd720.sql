-- Remover a política antiga de SELECT only para vendedor
DROP POLICY IF EXISTS "Vendedor can view all vehicles" ON logistics_vehicles;

-- Criar nova política que permite vendedor gerenciar todos os veículos
CREATE POLICY "Vendedor can manage all vehicles"
ON logistics_vehicles
FOR ALL
TO public
USING (has_role(auth.uid(), 'vendedor'::app_role))
WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));