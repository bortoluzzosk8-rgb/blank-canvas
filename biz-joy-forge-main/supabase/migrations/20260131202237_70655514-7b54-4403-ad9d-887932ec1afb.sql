-- =====================================================
-- FIX: Multi-Tenant Isolation for Products & Inventory
-- =====================================================

-- 1. REMOVE PROBLEMATIC POLICIES
-- These policies allow unrestricted access across tenants

DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Franqueadora can manage all inventory_items" ON inventory_items;

-- 2. ADD PUBLIC POLICY FOR CATALOG (anon users only)
-- Allow public catalog to show products, filtered by franchise_id in query

CREATE POLICY "Public can view products for catalog"
ON products FOR SELECT TO anon
USING (franchise_id IS NOT NULL);

-- 3. RECREATE PRODUCTS POLICY WITH NULL HANDLING
-- Ensure franchise_id IS NOT NULL check prevents data leakage

DROP POLICY IF EXISTS "Franqueadora can manage own tenant products" ON products;

CREATE POLICY "Franqueadora can manage own tenant products"
ON products FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND franchise_id IS NOT NULL
  AND belongs_to_user_tenant(franchise_id)
)
WITH CHECK (
  has_role(auth.uid(), 'franqueadora'::app_role) 
  AND franchise_id IS NOT NULL
  AND belongs_to_user_tenant(franchise_id)
);

-- 4. CLEAN UP ORPHAN PRODUCTS
-- Associate products without franchise_id to PLAY GESTOR (original owner)

UPDATE products 
SET franchise_id = 'e8019f6e-fdbf-480b-916a-71f9cc52b2c6' 
WHERE franchise_id IS NULL;

-- 5. PREVENT FUTURE ORPHAN PRODUCTS
-- Make franchise_id NOT NULL to enforce tenant ownership

ALTER TABLE products ALTER COLUMN franchise_id SET NOT NULL;