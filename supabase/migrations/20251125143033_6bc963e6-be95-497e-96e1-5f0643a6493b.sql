-- Make payment-receipts bucket public so images are accessible via URL
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-receipts';