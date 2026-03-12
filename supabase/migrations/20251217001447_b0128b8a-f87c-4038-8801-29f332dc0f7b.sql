-- Adicionar campos de check-in na tabela logistics_assignments
ALTER TABLE logistics_assignments 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente';

ALTER TABLE logistics_assignments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE logistics_assignments 
ADD COLUMN IF NOT EXISTS completed_by UUID;

ALTER TABLE logistics_assignments
ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE logistics_assignments
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;