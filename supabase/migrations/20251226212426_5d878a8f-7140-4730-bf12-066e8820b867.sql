-- Create asset_categories table (subcategories like Imóvel, Veículo, Equipamento)
CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏢',
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_categories
CREATE POLICY "Franqueadora can manage all asset_categories"
ON public.asset_categories FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise asset_categories"
ON public.asset_categories FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Anyone can view global asset_categories"
ON public.asset_categories FOR SELECT
USING (franchise_id IS NULL);

-- Create assets table (patrimônios)
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  purchase_value NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  current_value NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'written_off')),
  description TEXT,
  notes TEXT,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets
CREATE POLICY "Franqueadora can manage all assets"
ON public.assets FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise assets"
ON public.assets FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

-- Add asset_id column to expenses table
ALTER TABLE public.expenses ADD COLUMN asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

-- Insert default asset categories (global)
INSERT INTO public.asset_categories (name, icon, franchise_id) VALUES
  ('Imóvel', '🏠', NULL),
  ('Veículo', '🚗', NULL),
  ('Equipamento', '🔧', NULL),
  ('Móveis', '🪑', NULL),
  ('Tecnologia', '💻', NULL),
  ('Outros', '📦', NULL);

-- Create trigger for updated_at on asset_categories
CREATE TRIGGER update_asset_categories_updated_at
BEFORE UPDATE ON public.asset_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on assets
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();