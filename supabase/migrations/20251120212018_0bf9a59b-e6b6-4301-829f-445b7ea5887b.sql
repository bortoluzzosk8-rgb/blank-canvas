-- FASE 2: Atualizar RLS para products - Franqueado apenas SELECT
DROP POLICY IF EXISTS "Franqueado can manage own franchise products" ON public.products;

CREATE POLICY "Franqueado can view own franchise products"
ON public.products
FOR SELECT
TO authenticated
USING (
  franchise_id IN (
    SELECT user_franchises.franchise_id
    FROM user_franchises
    WHERE user_franchises.user_id = auth.uid()
  )
);

-- FASE 3: Atualizar RLS para purchases - Franqueado apenas SELECT
DROP POLICY IF EXISTS "Franqueado can manage own franchise purchases" ON public.purchases;

CREATE POLICY "Franqueado can view own franchise purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (
  franchise_id IN (
    SELECT user_franchises.franchise_id
    FROM user_franchises
    WHERE user_franchises.user_id = auth.uid()
  )
);

-- FASE 5: Atualizar view stock_summary para incluir franchise_id
DROP VIEW IF EXISTS public.stock_summary;

CREATE VIEW public.stock_summary AS
SELECT 
  p.id,
  p.name AS product_name,
  p.image_url,
  p.category_id,
  p.sale_price,
  p.cost_price,
  p.franchise_id,
  COALESCE(SUM(pu.quantity), 0) AS total_purchased,
  COALESCE(SUM(si.quantity), 0) AS total_sold,
  COALESCE(SUM(pu.quantity), 0) - COALESCE(SUM(si.quantity), 0) AS stock_balance,
  (COALESCE(SUM(pu.quantity), 0) - COALESCE(SUM(si.quantity), 0)) * p.cost_price AS stock_value
FROM products p
LEFT JOIN purchases pu ON p.id = pu.product_id
LEFT JOIN sale_items si ON p.id = si.product_id
GROUP BY p.id, p.name, p.image_url, p.category_id, p.sale_price, p.cost_price, p.franchise_id;