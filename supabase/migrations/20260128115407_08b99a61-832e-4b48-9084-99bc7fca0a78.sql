-- Add Asaas subscription fields to franchises table
ALTER TABLE franchises
ADD COLUMN IF NOT EXISTS asaas_customer_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS asaas_subscription_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_due_date date DEFAULT NULL;

-- Create subscription_payments table for payment history
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
  asaas_payment_id text NOT NULL,
  billing_type text NOT NULL,
  value numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  payment_date date,
  boleto_url text,
  boleto_barcode text,
  pix_qrcode text,
  pix_qrcode_image text,
  pix_expiration_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_payments
CREATE POLICY "Franqueadora can manage own franchise subscription_payments"
ON subscription_payments
FOR ALL
USING (
  franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  )
  OR
  franchise_id IN (
    SELECT id FROM franchises WHERE parent_franchise_id IN (
      SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Super admin can manage all subscription_payments"
ON subscription_payments
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_payments_franchise_id ON subscription_payments(franchise_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_asaas_payment_id ON subscription_payments(asaas_payment_id);