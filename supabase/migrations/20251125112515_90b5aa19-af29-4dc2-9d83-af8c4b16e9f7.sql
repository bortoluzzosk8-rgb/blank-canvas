-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false);

-- Storage policies for payment receipts
CREATE POLICY "Users can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (has_role(auth.uid(), 'franqueadora'::app_role) OR
   EXISTS (
     SELECT 1 FROM sales s
     WHERE s.franchise_id IN (
       SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
     )
   ))
);

CREATE POLICY "Users can view payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  (has_role(auth.uid(), 'franqueadora'::app_role) OR
   EXISTS (
     SELECT 1 FROM sales s
     WHERE s.franchise_id IN (
       SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
     )
   ))
);

CREATE POLICY "Users can delete payment receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'payment-receipts' AND
  (has_role(auth.uid(), 'franqueadora'::app_role) OR
   EXISTS (
     SELECT 1 FROM sales s
     WHERE s.franchise_id IN (
       SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
     )
   ))
);

-- Create sale_payments table
CREATE TABLE sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_type TEXT NOT NULL CHECK (payment_type IN ('sinal', 'pagamento', 'complemento')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'debito', 'credito', 'boleto')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  
  -- For credit card installments
  installments INTEGER DEFAULT 1 CHECK (installments > 0 AND installments <= 12),
  
  -- Status and dates
  payment_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  
  -- Receipt file
  receipt_url TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sale_payments
CREATE POLICY "Franqueado can view own franchise sale_payments"
ON sale_payments
FOR SELECT
USING (
  sale_id IN (
    SELECT id FROM sales 
    WHERE franchise_id IN (
      SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueado can insert own franchise sale_payments"
ON sale_payments
FOR INSERT
WITH CHECK (
  sale_id IN (
    SELECT id FROM sales 
    WHERE franchise_id IN (
      SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueado can update own franchise sale_payments"
ON sale_payments
FOR UPDATE
USING (
  sale_id IN (
    SELECT id FROM sales 
    WHERE franchise_id IN (
      SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueado can delete own franchise sale_payments"
ON sale_payments
FOR DELETE
USING (
  sale_id IN (
    SELECT id FROM sales 
    WHERE franchise_id IN (
      SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueadora can manage all sale_payments"
ON sale_payments
FOR ALL
USING (has_role(auth.uid(), 'franqueadora'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_sale_payments_updated_at
BEFORE UPDATE ON sale_payments
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();