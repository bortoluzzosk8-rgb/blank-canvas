-- Create sellers table
CREATE TABLE public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers table
CREATE POLICY "Franqueadora can manage all sellers" ON public.sellers
  FOR ALL USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Vendedor can view own record" ON public.sellers
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for vendedor to view inventory_items
CREATE POLICY "Vendedor can view all inventory_items" ON public.inventory_items
  FOR SELECT USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policies for vendedor to manage sales (all units)
CREATE POLICY "Vendedor can manage all sales" ON public.sales
  FOR ALL USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policies for vendedor to manage sale_items
CREATE POLICY "Vendedor can manage all sale_items" ON public.sale_items
  FOR ALL USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policies for vendedor to manage sale_payments
CREATE POLICY "Vendedor can manage all sale_payments" ON public.sale_payments
  FOR ALL USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policy for vendedor to view franchises (needed to show franchise names)
CREATE POLICY "Vendedor can view all franchises" ON public.franchises
  FOR SELECT USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policy for vendedor to view products
CREATE POLICY "Vendedor can view all products" ON public.products
  FOR SELECT USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policy for vendedor to update equipment status (for maintenance)
CREATE POLICY "Vendedor can update equipment status for maintenance" ON public.inventory_items
  FOR UPDATE USING (has_role(auth.uid(), 'vendedor'::app_role));