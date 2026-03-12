-- Create logos bucket for storing company logos and signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads
CREATE POLICY "Allow authenticated uploads logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Policy to allow public read
CREATE POLICY "Allow public read logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

-- Policy to allow authenticated updates
CREATE POLICY "Allow authenticated updates logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Policy to allow authenticated deletes
CREATE POLICY "Allow authenticated deletes logos" ON storage.objects
FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');