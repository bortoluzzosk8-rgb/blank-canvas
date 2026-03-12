-- ========================================
-- 1. TABELA: inventory_movements
-- ========================================

-- Remover política antiga que permite acesso irrestrito
DROP POLICY IF EXISTS "Franqueadora can manage all inventory_movements" ON inventory_movements;

-- Recriar política com filtro correto (deve verificar ambos os lados)
DROP POLICY IF EXISTS "Franqueadora can manage own tenant inventory movements" ON inventory_movements;
CREATE POLICY "Franqueadora can manage own tenant inventory movements"
ON inventory_movements FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND (
    belongs_to_user_tenant(to_franchise_id) 
    OR belongs_to_user_tenant(from_franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND (
    belongs_to_user_tenant(to_franchise_id) 
    OR belongs_to_user_tenant(from_franchise_id)
  )
);

-- ========================================
-- 2. TABELA: equipment_movement_history
-- ========================================

-- Remover política antiga que permite acesso irrestrito
DROP POLICY IF EXISTS "Franqueadora can manage all equipment movements" ON equipment_movement_history;

-- Recriar política com filtro correto
DROP POLICY IF EXISTS "Franqueadora can manage own tenant equipment movement history" ON equipment_movement_history;
CREATE POLICY "Franqueadora can manage own tenant equipment movement history"
ON equipment_movement_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND (
    belongs_to_user_tenant(to_franchise_id) 
    OR belongs_to_user_tenant(from_franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND (
    belongs_to_user_tenant(to_franchise_id) 
    OR belongs_to_user_tenant(from_franchise_id)
  )
);