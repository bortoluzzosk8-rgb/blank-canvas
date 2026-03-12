-- Adicionar coluna para controlar se manutenção bloqueia reservas
ALTER TABLE inventory_items 
ADD COLUMN blocks_reservations boolean DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN inventory_items.blocks_reservations IS 'Se true, item em manutenção não pode ser reservado. Se false, pode ser reservado mesmo em manutenção.';