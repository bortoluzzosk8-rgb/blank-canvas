-- Adicionar campo para valor de monitoria
ALTER TABLE sales ADD COLUMN IF NOT EXISTS monitoring_value NUMERIC DEFAULT 0;

-- Adicionar campo para valor de frete
ALTER TABLE sales ADD COLUMN IF NOT EXISTS freight_value NUMERIC DEFAULT 0;