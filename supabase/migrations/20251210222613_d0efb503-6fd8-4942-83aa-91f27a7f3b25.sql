-- Remove a política restritiva atual de SELECT para franqueados
DROP POLICY IF EXISTS "Franqueado can view own franchise inventory_items" ON inventory_items;

-- Cria nova política que permite franqueados visualizarem TODOS os itens para fins de reserva
CREATE POLICY "Franqueado can view all inventory_items" 
ON inventory_items FOR SELECT
USING (
  has_role(auth.uid(), 'franqueado'::app_role)
);