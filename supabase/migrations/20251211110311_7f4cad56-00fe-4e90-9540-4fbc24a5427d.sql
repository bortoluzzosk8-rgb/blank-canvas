-- Adicionar campos cnpj e cep na tabela franchises
ALTER TABLE public.franchises 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS cep text;