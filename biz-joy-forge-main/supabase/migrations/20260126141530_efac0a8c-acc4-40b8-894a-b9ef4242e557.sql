-- Create table for monitoring slots
CREATE TABLE public.sale_monitoring_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  monitors_quantity INTEGER NOT NULL DEFAULT 1,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_monitoring_slots ENABLE ROW LEVEL SECURITY;

-- Create policies matching sales table pattern
CREATE POLICY "Users can view monitoring slots" 
ON public.sale_monitoring_slots 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert monitoring slots" 
ON public.sale_monitoring_slots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update monitoring slots" 
ON public.sale_monitoring_slots 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete monitoring slots" 
ON public.sale_monitoring_slots 
FOR DELETE 
USING (true);