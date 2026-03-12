-- Add card_fee column to sale_payments table
ALTER TABLE public.sale_payments ADD COLUMN card_fee numeric DEFAULT 0;