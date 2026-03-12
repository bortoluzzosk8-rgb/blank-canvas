-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installments INTEGER NOT NULL,
  installment_amount NUMERIC NOT NULL,
  first_due_date DATE NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  franchise_id UUID REFERENCES public.franchises(id),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create loan_installments table
CREATE TABLE public.loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  franchise_id UUID REFERENCES public.franchises(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

-- RLS policies for loans
CREATE POLICY "Franqueado can manage own franchise loans"
ON public.loans FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Franqueadora can manage all loans"
ON public.loans FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

-- RLS policies for loan_installments
CREATE POLICY "Franqueado can manage own franchise loan_installments"
ON public.loan_installments FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Franqueadora can manage all loan_installments"
ON public.loan_installments FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

-- Create indexes for performance
CREATE INDEX idx_loans_franchise_id ON public.loans(franchise_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loan_installments_loan_id ON public.loan_installments(loan_id);
CREATE INDEX idx_loan_installments_due_date ON public.loan_installments(due_date);
CREATE INDEX idx_loan_installments_status ON public.loan_installments(status);