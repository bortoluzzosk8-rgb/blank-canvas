-- Adicionar coluna monitors_quantity na tabela sales
ALTER TABLE sales 
ADD COLUMN monitors_quantity integer DEFAULT 0;