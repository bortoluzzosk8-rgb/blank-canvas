
-- =====================================================
-- CORREÇÃO DE ISOLAMENTO MULTI-TENANT
-- Cria função helper e atualiza 30 políticas RLS
-- =====================================================

-- 1. Criar função helper para verificar se registro pertence ao tenant do usuário
CREATE OR REPLACE FUNCTION public.belongs_to_user_tenant(record_franchise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_franchises uf
    WHERE uf.user_id = auth.uid()
    AND (
      -- A franquia raiz do usuário é a mesma do registro
      record_franchise_id = uf.franchise_id
      OR
      -- O registro pertence a uma unidade filha da franquia do usuário
      record_franchise_id IN (
        SELECT id FROM public.franchises 
        WHERE parent_franchise_id = uf.franchise_id
      )
      OR
      -- A franquia do usuário é filha da mesma raiz do registro
      uf.franchise_id IN (
        SELECT id FROM public.franchises 
        WHERE parent_franchise_id = (
          SELECT COALESCE(parent_franchise_id, id) 
          FROM public.franchises 
          WHERE id = record_franchise_id
        )
      )
    )
  )
$$;

-- =====================================================
-- TABELAS DE PRIORIDADE ALTA
-- =====================================================

-- SALES
DROP POLICY IF EXISTS "Franqueadora can manage all sales" ON public.sales;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant sales" ON public.sales;
CREATE POLICY "Franqueadora can manage own tenant sales"
ON public.sales FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- SALE_ITEMS (usa sale_id para buscar franchise_id via sales)
DROP POLICY IF EXISTS "Franqueadora can manage all sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant sale items" ON public.sale_items;
CREATE POLICY "Franqueadora can manage own tenant sale items"
ON public.sale_items FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_items.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_items.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
);

-- PRODUCTS
DROP POLICY IF EXISTS "Franqueadora can manage all products" ON public.products;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant products" ON public.products;
CREATE POLICY "Franqueadora can manage own tenant products"
ON public.products FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Franqueadora can manage all inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant inventory" ON public.inventory_items;
CREATE POLICY "Franqueadora can manage own tenant inventory"
ON public.inventory_items FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- CLIENTS
DROP POLICY IF EXISTS "Franqueadora can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant clients" ON public.clients;
CREATE POLICY "Franqueadora can manage own tenant clients"
ON public.clients FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- EXPENSES
DROP POLICY IF EXISTS "Franqueadora can manage all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant expenses" ON public.expenses;
CREATE POLICY "Franqueadora can manage own tenant expenses"
ON public.expenses FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- DRIVERS
DROP POLICY IF EXISTS "Franqueadora can manage all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant drivers" ON public.drivers;
CREATE POLICY "Franqueadora can manage own tenant drivers"
ON public.drivers FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- FRANCHISES
DROP POLICY IF EXISTS "Franqueadora can manage all franchises" ON public.franchises;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant franchises" ON public.franchises;
CREATE POLICY "Franqueadora can manage own tenant franchises"
ON public.franchises FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(id)
);

-- =====================================================
-- TABELAS DE PRIORIDADE MÉDIA
-- =====================================================

-- CREDIT_CARDS
DROP POLICY IF EXISTS "Franqueadora can manage all credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant credit cards" ON public.credit_cards;
CREATE POLICY "Franqueadora can manage own tenant credit cards"
ON public.credit_cards FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- LOANS
DROP POLICY IF EXISTS "Franqueadora can manage all loans" ON public.loans;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant loans" ON public.loans;
CREATE POLICY "Franqueadora can manage own tenant loans"
ON public.loans FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- LOAN_INSTALLMENTS
DROP POLICY IF EXISTS "Franqueadora can manage all loan installments" ON public.loan_installments;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant loan installments" ON public.loan_installments;
CREATE POLICY "Franqueadora can manage own tenant loan installments"
ON public.loan_installments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- ASSET_CATEGORIES
DROP POLICY IF EXISTS "Franqueadora can manage all asset categories" ON public.asset_categories;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant asset categories" ON public.asset_categories;
CREATE POLICY "Franqueadora can manage own tenant asset categories"
ON public.asset_categories FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- ASSETS
DROP POLICY IF EXISTS "Franqueadora can manage all assets" ON public.assets;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant assets" ON public.assets;
CREATE POLICY "Franqueadora can manage own tenant assets"
ON public.assets FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "Franqueadora can manage all expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant expense categories" ON public.expense_categories;
CREATE POLICY "Franqueadora can manage own tenant expense categories"
ON public.expense_categories FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- INVENTORY_ARCHIVE
DROP POLICY IF EXISTS "Franqueadora can manage all inventory archive" ON public.inventory_archive;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant inventory archive" ON public.inventory_archive;
CREATE POLICY "Franqueadora can manage own tenant inventory archive"
ON public.inventory_archive FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "Franqueadora can manage all inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant inventory movements" ON public.inventory_movements;
CREATE POLICY "Franqueadora can manage own tenant inventory movements"
ON public.inventory_movements FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(to_franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(to_franchise_id)
);

-- MONITORS
DROP POLICY IF EXISTS "Franqueadora can manage all monitors" ON public.monitors;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant monitors" ON public.monitors;
CREATE POLICY "Franqueadora can manage own tenant monitors"
ON public.monitors FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- SELLERS (não tem franchise_id, usa user_franchises diretamente)
DROP POLICY IF EXISTS "Franqueadora can manage all sellers" ON public.sellers;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant sellers" ON public.sellers;
CREATE POLICY "Franqueadora can manage own tenant sellers"
ON public.sellers FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_franchises uf1
    JOIN public.user_franchises uf2 ON (
      uf1.franchise_id = uf2.franchise_id
      OR uf1.franchise_id IN (
        SELECT id FROM public.franchises WHERE parent_franchise_id = uf2.franchise_id
      )
      OR uf2.franchise_id IN (
        SELECT id FROM public.franchises WHERE parent_franchise_id = uf1.franchise_id
      )
    )
    WHERE uf1.user_id = auth.uid()
    AND uf2.user_id = sellers.user_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role)
);

-- LOGISTICS_VEHICLES
DROP POLICY IF EXISTS "Franqueadora can manage all logistics vehicles" ON public.logistics_vehicles;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant logistics vehicles" ON public.logistics_vehicles;
CREATE POLICY "Franqueadora can manage own tenant logistics vehicles"
ON public.logistics_vehicles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- LOGISTICS_ASSIGNMENTS
DROP POLICY IF EXISTS "Franqueadora can manage all logistics assignments" ON public.logistics_assignments;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant logistics assignments" ON public.logistics_assignments;
CREATE POLICY "Franqueadora can manage own tenant logistics assignments"
ON public.logistics_assignments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- PURCHASES
DROP POLICY IF EXISTS "Franqueadora can manage all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant purchases" ON public.purchases;
CREATE POLICY "Franqueadora can manage own tenant purchases"
ON public.purchases FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- PRODUCT_CODES
DROP POLICY IF EXISTS "Franqueadora can manage all product codes" ON public.product_codes;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant product codes" ON public.product_codes;
CREATE POLICY "Franqueadora can manage own tenant product codes"
ON public.product_codes FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- SALE_PAYMENTS (usa sale_id para buscar franchise_id via sales)
DROP POLICY IF EXISTS "Franqueadora can manage all sale payments" ON public.sale_payments;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant sale payments" ON public.sale_payments;
CREATE POLICY "Franqueadora can manage own tenant sale payments"
ON public.sale_payments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_payments.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_payments.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
);

-- SETTINGS (não tem franchise_id, precisa criar vínculo ou usar outra lógica)
-- Mantém política existente por enquanto, settings é global

-- EQUIPMENT_ARCHIVE
DROP POLICY IF EXISTS "Franqueadora can manage all equipment archive" ON public.equipment_archive;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant equipment archive" ON public.equipment_archive;
CREATE POLICY "Franqueadora can manage own tenant equipment archive"
ON public.equipment_archive FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- EQUIPMENT_MOVEMENT_HISTORY
DROP POLICY IF EXISTS "Franqueadora can manage all equipment movement history" ON public.equipment_movement_history;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant equipment movement history" ON public.equipment_movement_history;
CREATE POLICY "Franqueadora can manage own tenant equipment movement history"
ON public.equipment_movement_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(to_franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(to_franchise_id)
);

-- EQUIPMENT_STATUS (usa product_code_id para buscar franchise_id)
DROP POLICY IF EXISTS "Franqueadora can manage all equipment status" ON public.equipment_status;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant equipment status" ON public.equipment_status;
CREATE POLICY "Franqueadora can manage own tenant equipment status"
ON public.equipment_status FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.product_codes pc 
    WHERE pc.id = equipment_status.product_code_id 
    AND belongs_to_user_tenant(pc.franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.product_codes pc 
    WHERE pc.id = equipment_status.product_code_id 
    AND belongs_to_user_tenant(pc.franchise_id)
  )
);

-- VEHICLE_DRIVER_ASSIGNMENTS
DROP POLICY IF EXISTS "Franqueadora can manage all vehicle driver assignments" ON public.vehicle_driver_assignments;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant vehicle driver assignments" ON public.vehicle_driver_assignments;
CREATE POLICY "Franqueadora can manage own tenant vehicle driver assignments"
ON public.vehicle_driver_assignments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- USER_FRANCHISES (usuário só vê seus próprios vínculos ou vínculos do mesmo tenant)
DROP POLICY IF EXISTS "Franqueadora can manage all user franchises" ON public.user_franchises;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant user franchises" ON public.user_franchises;
CREATE POLICY "Franqueadora can manage own tenant user franchises"
ON public.user_franchises FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);

-- SALE_MONITORING_SLOTS (usa sale_id para buscar franchise_id via sales)
DROP POLICY IF EXISTS "Franqueadora can manage all sale monitoring slots" ON public.sale_monitoring_slots;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant sale monitoring slots" ON public.sale_monitoring_slots;
CREATE POLICY "Franqueadora can manage own tenant sale monitoring slots"
ON public.sale_monitoring_slots FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_monitoring_slots.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_monitoring_slots.sale_id 
    AND belongs_to_user_tenant(s.franchise_id)
  )
);

-- SUBSCRIPTION_PAYMENTS (usa franchise_id diretamente)
DROP POLICY IF EXISTS "Franqueadora can manage all subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Franqueadora can manage own tenant subscription payments" ON public.subscription_payments;
CREATE POLICY "Franqueadora can manage own tenant subscription payments"
ON public.subscription_payments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND belongs_to_user_tenant(franchise_id)
);
