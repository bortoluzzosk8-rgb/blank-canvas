-- Adicionar coluna return_time para horário de retirada
ALTER TABLE sales ADD COLUMN IF NOT EXISTS return_time TIME;