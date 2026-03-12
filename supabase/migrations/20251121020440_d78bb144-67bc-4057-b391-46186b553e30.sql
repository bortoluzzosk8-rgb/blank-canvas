-- Adicionar novos campos de locação à tabela sales
ALTER TABLE sales
  ADD COLUMN delivery_address TEXT,
  ADD COLUMN delivery_city TEXT,
  ADD COLUMN delivery_state TEXT,
  ADD COLUMN delivery_cep TEXT,
  ADD COLUMN party_start_time TIME,
  ADD COLUMN with_monitoring BOOLEAN DEFAULT false,
  ADD COLUMN monitors_names TEXT;

-- Comentários para documentação
COMMENT ON COLUMN sales.delivery_address IS 'Endereço completo de entrega (pode ser diferente do endereço do cliente)';
COMMENT ON COLUMN sales.delivery_city IS 'Cidade de entrega';
COMMENT ON COLUMN sales.delivery_state IS 'Estado de entrega';
COMMENT ON COLUMN sales.delivery_cep IS 'CEP de entrega';
COMMENT ON COLUMN sales.party_start_time IS 'Horário de início da festa';
COMMENT ON COLUMN sales.with_monitoring IS 'Indica se a venda inclui monitoria';
COMMENT ON COLUMN sales.monitors_names IS 'Nomes dos monitores (separados por vírgula)';