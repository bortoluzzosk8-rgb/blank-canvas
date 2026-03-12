-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Franqueado can manage own franchise expense_categories
CREATE POLICY "Franqueado can manage own franchise expense_categories"
  ON public.expense_categories FOR ALL
  USING (franchise_id IN (SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()));

-- Franqueadora can manage all expense_categories
CREATE POLICY "Franqueadora can manage all expense_categories"
  ON public.expense_categories FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'));

-- Anyone can view global expense_categories (franchise_id IS NULL)
CREATE POLICY "Anyone can view global expense_categories"
  ON public.expense_categories FOR SELECT
  USING (franchise_id IS NULL);

-- Insert default categories (global)
INSERT INTO public.expense_categories (name, icon, franchise_id) VALUES
  ('Combustível', '⛽', NULL),
  ('Aluguel', '🏠', NULL),
  ('Manutenção', '🔧', NULL),
  ('Salários', '💼', NULL),
  ('Marketing', '📣', NULL),
  ('Impostos', '📋', NULL),
  ('Serviços', '🛠️', NULL),
  ('Materiais', '📦', NULL),
  ('Outros', '📝', NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();