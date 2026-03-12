-- Criar bucket para imagens de equipamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true);

-- Política para usuários autenticados fazerem upload
CREATE POLICY "Authenticated users can upload inventory images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

-- Política para acesso público às imagens
CREATE POLICY "Public can view inventory images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inventory-images');

-- Política para usuários autenticados deletarem suas imagens
CREATE POLICY "Authenticated users can delete inventory images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inventory-images');