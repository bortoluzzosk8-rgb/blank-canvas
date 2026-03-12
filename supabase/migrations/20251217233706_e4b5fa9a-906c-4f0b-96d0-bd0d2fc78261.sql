-- Create expenses table for general expenses (not product purchases)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  franchise_id UUID REFERENCES public.franchises(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Franqueadora can manage all expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can manage own franchise expenses"
ON public.expenses FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();