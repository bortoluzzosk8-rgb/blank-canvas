-- Fase 1.2: Criar estrutura de franquias

-- 1. Criar tabela de franquias/unidades
CREATE TABLE public.franchises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Criar tabela de vinculação usuário-franquia
CREATE TABLE public.user_franchises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, franchise_id)
);

-- 3. Adicionar franchise_id nas tabelas existentes
ALTER TABLE public.products ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);
ALTER TABLE public.product_codes ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);
ALTER TABLE public.purchases ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);
ALTER TABLE public.clients ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);

-- 4. Transformar sales em rentals (adicionar campos de locação)
ALTER TABLE public.sales ADD COLUMN rental_start_date DATE;
ALTER TABLE public.sales ADD COLUMN rental_end_date DATE;
ALTER TABLE public.sales ADD COLUMN return_date DATE;
ALTER TABLE public.sales ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);

-- 5. Enable RLS
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_franchises ENABLE ROW LEVEL SECURITY;

-- 6. Trigger para updated_at em franchises
CREATE TRIGGER update_franchises_updated_at
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. RLS Policies para franchises

-- Franqueadora pode ver todas as franquias
CREATE POLICY "Franqueadora can view all franchises"
  ON public.franchises
  FOR SELECT
  USING (has_role(auth.uid(), 'franqueadora'));

-- Franqueado pode ver apenas sua franquia
CREATE POLICY "Franqueado can view own franchise"
  ON public.franchises
  FOR SELECT
  USING (
    id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Franqueadora pode gerenciar franquias
CREATE POLICY "Franqueadora can manage franchises"
  ON public.franchises
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

-- 8. RLS Policies para user_franchises

-- Franqueadora pode ver todos os vínculos
CREATE POLICY "Franqueadora can view all user_franchises"
  ON public.user_franchises
  FOR SELECT
  USING (has_role(auth.uid(), 'franqueadora'));

-- Franqueado pode ver apenas seus vínculos
CREATE POLICY "Franqueado can view own franchises"
  ON public.user_franchises
  FOR SELECT
  USING (user_id = auth.uid());

-- Franqueadora pode gerenciar vínculos
CREATE POLICY "Franqueadora can manage user_franchises"
  ON public.user_franchises
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

-- 9. Atualizar RLS policies das tabelas existentes para respeitar franchise_id

-- Products: Franqueadora vê tudo, Franqueado vê apenas da sua unidade
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

CREATE POLICY "Franqueadora can manage all products"
  ON public.products
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise products"
  ON public.products
  FOR ALL
  USING (
    franchise_id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Purchases: Franqueadora vê tudo, Franqueado vê apenas da sua unidade
DROP POLICY IF EXISTS "Only admins can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Only admins can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Only admins can delete purchases" ON public.purchases;
DROP POLICY IF EXISTS "Only admins can view purchases" ON public.purchases;

CREATE POLICY "Franqueadora can manage all purchases"
  ON public.purchases
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise purchases"
  ON public.purchases
  FOR ALL
  USING (
    franchise_id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Sales/Rentals: Franqueadora vê tudo, Franqueado vê apenas da sua unidade
DROP POLICY IF EXISTS "Only admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Only admins can update sales" ON public.purchases;
DROP POLICY IF EXISTS "Only admins can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Only admins can view sales" ON public.sales;

CREATE POLICY "Franqueadora can manage all sales"
  ON public.sales
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise sales"
  ON public.sales
  FOR ALL
  USING (
    franchise_id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Clients: Franqueadora vê tudo, Franqueado vê apenas da sua unidade
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Franqueadora can manage all clients"
  ON public.clients
  FOR DELETE
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can delete own franchise clients"
  ON public.clients
  FOR DELETE
  USING (
    franchise_id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Product codes: Franqueadora vê tudo, Franqueado vê apenas da sua unidade
DROP POLICY IF EXISTS "Admins can view product codes" ON public.product_codes;
DROP POLICY IF EXISTS "Admins can insert product codes" ON public.product_codes;
DROP POLICY IF EXISTS "Admins can update product codes" ON public.product_codes;
DROP POLICY IF EXISTS "Admins can delete product codes" ON public.product_codes;

CREATE POLICY "Franqueadora can manage all product_codes"
  ON public.product_codes
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise product_codes"
  ON public.product_codes
  FOR ALL
  USING (
    franchise_id IN (
      SELECT franchise_id 
      FROM public.user_franchises 
      WHERE user_id = auth.uid()
    )
  );

-- Sale items: Franqueadora vê tudo, Franqueado vê apenas através das sales da sua unidade
DROP POLICY IF EXISTS "Admins can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can update sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can delete sale items" ON public.sale_items;

CREATE POLICY "Franqueadora can manage all sale_items"
  ON public.sale_items
  FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise sale_items"
  ON public.sale_items
  FOR ALL
  USING (
    sale_id IN (
      SELECT id FROM public.sales
      WHERE franchise_id IN (
        SELECT franchise_id 
        FROM public.user_franchises 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 10. Criar função auxiliar para obter franchise_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_franchise_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT franchise_id
  FROM public.user_franchises
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 11. Inserir 8 unidades padrão
INSERT INTO public.franchises (name, city, state) VALUES
  ('ENGBRINK - Curitiba', 'Curitiba', 'PR'),
  ('ENGBRINK - São Paulo', 'São Paulo', 'SP'),
  ('ENGBRINK - Rio de Janeiro', 'Rio de Janeiro', 'RJ'),
  ('ENGBRINK - Belo Horizonte', 'Belo Horizonte', 'MG'),
  ('ENGBRINK - Porto Alegre', 'Porto Alegre', 'RS'),
  ('ENGBRINK - Brasília', 'Brasília', 'DF'),
  ('ENGBRINK - Salvador', 'Salvador', 'BA'),
  ('ENGBRINK - Fortaleza', 'Fortaleza', 'CE');