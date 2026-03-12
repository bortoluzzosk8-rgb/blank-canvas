-- Add credit_limit column to credit_cards table
ALTER TABLE public.credit_cards ADD COLUMN credit_limit numeric DEFAULT 0;