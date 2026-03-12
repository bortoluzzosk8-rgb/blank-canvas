-- Permitir acesso público de leitura à tabela sales (para contratos públicos)
CREATE POLICY "Public can view sale by id" 
ON sales 
FOR SELECT 
TO anon
USING (true);

-- Permitir acesso público de leitura à tabela sale_items (para contratos públicos)
CREATE POLICY "Public can view sale_items by sale_id" 
ON sale_items 
FOR SELECT 
TO anon
USING (true);

-- Permitir acesso público de leitura à tabela franchises (para contratos públicos)
CREATE POLICY "Public can view franchises" 
ON franchises 
FOR SELECT 
TO anon
USING (true);