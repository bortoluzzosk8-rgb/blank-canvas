-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank TEXT,
  last_digits TEXT,
  closing_day INTEGER,
  due_day INTEGER,
  franchise_id UUID REFERENCES public.franchises(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Franqueado can manage own franchise credit_cards"
ON public.credit_cards
FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Franqueadora can manage all credit_cards"
ON public.credit_cards
FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

-- Add credit_card_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id);

-- Create trigger for updated_at
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();