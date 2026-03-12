-- Add percentage columns to franchises table for profit split configuration
ALTER TABLE franchises 
ADD COLUMN IF NOT EXISTS franqueado_percentage NUMERIC DEFAULT 60,
ADD COLUMN IF NOT EXISTS franqueadora_percentage NUMERIC DEFAULT 40,
ADD COLUMN IF NOT EXISTS equilibrio_inicial NUMERIC DEFAULT 0;

COMMENT ON COLUMN franchises.franqueado_percentage IS 'Percentage of net profit that goes to franchisee';
COMMENT ON COLUMN franchises.franqueadora_percentage IS 'Percentage of net profit that goes to franchisor';
COMMENT ON COLUMN franchises.equilibrio_inicial IS 'Initial balance for franchisee equilibrium calculation';