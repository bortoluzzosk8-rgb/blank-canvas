-- Add franchise_id to sales table to track which franchise is handling the rental
ALTER TABLE sales ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_franchise_id ON sales(franchise_id);

-- Update RLS policy for franqueado to view only their franchise sales
DROP POLICY IF EXISTS "Franqueado can manage own franchise sales" ON sales;
CREATE POLICY "Franqueado can manage own franchise sales"
ON sales
FOR ALL
TO authenticated
USING (
  franchise_id IN (
    SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
  )
);