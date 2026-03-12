-- Adicionar campos para rastrear quem criou a locação
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by_name text;