-- Criar tabela equipment_status para rastrear status individual de cada product_code
CREATE TABLE equipment_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code_id UUID NOT NULL REFERENCES product_codes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'manutencao')),
  maintenance_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_equipment_status_code ON equipment_status(product_code_id);
CREATE INDEX idx_equipment_status_status ON equipment_status(status);

-- RLS Policies
ALTER TABLE equipment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all equipment_status"
ON equipment_status FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise equipment_status"
ON equipment_status FOR SELECT
TO authenticated
USING (
  product_code_id IN (
    SELECT pc.id FROM product_codes pc
    WHERE pc.franchise_id IN (
      SELECT uf.franchise_id FROM user_franchises uf
      WHERE uf.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueado can insert own franchise equipment_status"
ON equipment_status FOR INSERT
TO authenticated
WITH CHECK (
  product_code_id IN (
    SELECT pc.id FROM product_codes pc
    WHERE pc.franchise_id IN (
      SELECT uf.franchise_id FROM user_franchises uf
      WHERE uf.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Franqueado can update own franchise equipment_status"
ON equipment_status FOR UPDATE
TO authenticated
USING (
  product_code_id IN (
    SELECT pc.id FROM product_codes pc
    WHERE pc.franchise_id IN (
      SELECT uf.franchise_id FROM user_franchises uf
      WHERE uf.user_id = auth.uid()
    )
  )
);

-- Criar tabela equipment_movement_history para rastrear histórico de movimentações
CREATE TABLE equipment_movement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code_id UUID NOT NULL REFERENCES product_codes(id) ON DELETE CASCADE,
  from_franchise_id UUID REFERENCES franchises(id),
  to_franchise_id UUID NOT NULL REFERENCES franchises(id),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Índices
CREATE INDEX idx_movement_history_code ON equipment_movement_history(product_code_id);
CREATE INDEX idx_movement_history_date ON equipment_movement_history(moved_at);

-- RLS Policies
ALTER TABLE equipment_movement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all equipment movements"
ON equipment_movement_history FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise movements"
ON equipment_movement_history FOR SELECT
TO authenticated
USING (
  to_franchise_id IN (
    SELECT uf.franchise_id FROM user_franchises uf
    WHERE uf.user_id = auth.uid()
  )
  OR from_franchise_id IN (
    SELECT uf.franchise_id FROM user_franchises uf
    WHERE uf.user_id = auth.uid()
  )
);

-- Criar tabela equipment_archive para equipamentos excluídos
CREATE TABLE equipment_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_value NUMERIC NOT NULL,
  franchise_id UUID NOT NULL REFERENCES franchises(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (reason IN ('vendido', 'sucateado', 'outro')),
  notes TEXT,
  original_code TEXT NOT NULL,
  manufacture_date DATE,
  maintenance_history JSONB
);

-- RLS Policies
ALTER TABLE equipment_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all archives"
ON equipment_archive FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise archives"
ON equipment_archive FOR SELECT
TO authenticated
USING (
  franchise_id IN (
    SELECT uf.franchise_id FROM user_franchises uf
    WHERE uf.user_id = auth.uid()
  )
);