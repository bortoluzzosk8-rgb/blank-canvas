-- Add RLS policies for vendedor to manage drivers

-- Policy for vendedor to view all drivers
CREATE POLICY "Vendedor can view all drivers"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- Policy for vendedor to update drivers
CREATE POLICY "Vendedor can update all drivers"
  ON public.drivers
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- Policy for vendedor to delete drivers
CREATE POLICY "Vendedor can delete all drivers"
  ON public.drivers
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));