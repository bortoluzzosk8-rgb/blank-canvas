-- 1. Criar tabela principal de inventário (independente de products)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  code TEXT NOT NULL UNIQUE,
  manufacture_date DATE,
  franchise_id UUID REFERENCES franchises(id),
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'manutencao')),
  maintenance_note TEXT,
  image_url TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar tabela de arquivo de equipamentos deletados
CREATE TABLE inventory_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_item_id UUID,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  code TEXT NOT NULL,
  manufacture_date DATE,
  franchise_id UUID NOT NULL REFERENCES franchises(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  reason TEXT NOT NULL CHECK (reason IN ('vendido', 'sucateado', 'outro')),
  notes TEXT,
  image_url TEXT[]
);

-- 3. Criar tabela de movimentações entre franquias
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  from_franchise_id UUID REFERENCES franchises(id),
  to_franchise_id UUID NOT NULL REFERENCES franchises(id),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_by UUID,
  notes TEXT
);

-- 4. Criar índices para performance
CREATE INDEX idx_inventory_items_franchise ON inventory_items(franchise_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_code ON inventory_items(code);
CREATE INDEX idx_inventory_archive_franchise ON inventory_archive(franchise_id);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);

-- 5. Criar trigger para updated_at
CREATE TRIGGER handle_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 6. RLS Policies para inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all inventory_items"
  ON inventory_items FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise inventory_items"
  ON inventory_items FOR SELECT
  USING (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

CREATE POLICY "Franqueado can insert own franchise inventory_items"
  ON inventory_items FOR INSERT
  WITH CHECK (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

CREATE POLICY "Franqueado can update own franchise inventory_items"
  ON inventory_items FOR UPDATE
  USING (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

CREATE POLICY "Franqueado can delete own franchise inventory_items"
  ON inventory_items FOR DELETE
  USING (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

-- 7. RLS Policies para inventory_archive
ALTER TABLE inventory_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all inventory_archive"
  ON inventory_archive FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise inventory_archive"
  ON inventory_archive FOR SELECT
  USING (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

CREATE POLICY "Franqueado can insert own franchise inventory_archive"
  ON inventory_archive FOR INSERT
  WITH CHECK (franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  ));

-- 8. RLS Policies para inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueadora can manage all inventory_movements"
  ON inventory_movements FOR ALL
  USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can view own franchise inventory_movements"
  ON inventory_movements FOR SELECT
  USING (
    from_franchise_id IN (SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid())
    OR to_franchise_id IN (SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid())
  );

CREATE POLICY "Franqueado can insert own franchise inventory_movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    from_franchise_id IN (SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid())
    OR to_franchise_id IN (SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid())
  );