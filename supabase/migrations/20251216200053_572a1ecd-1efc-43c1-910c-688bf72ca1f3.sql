-- Add Asaas integration columns to sale_payments
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS asaas_status TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS pix_qrcode TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS pix_qrcode_image TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS pix_expiration_date TIMESTAMPTZ;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS boleto_url TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS boleto_barcode TEXT;
ALTER TABLE sale_payments ADD COLUMN IF NOT EXISTS payment_link TEXT;