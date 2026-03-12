-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  franchise_id UUID REFERENCES public.franchises(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Franqueadora can manage all drivers
CREATE POLICY "Franqueadora can manage all drivers" ON public.drivers
  FOR ALL USING (has_role(auth.uid(), 'franqueadora'));

-- Motorista can view own record
CREATE POLICY "Motorista can view own record" ON public.drivers
  FOR SELECT USING (user_id = auth.uid());

-- Add RLS policies for logistics tables so motoristas can access
CREATE POLICY "Motorista can view all vehicles" ON public.logistics_vehicles
  FOR SELECT USING (has_role(auth.uid(), 'motorista'));

CREATE POLICY "Motorista can view all assignments" ON public.logistics_assignments
  FOR SELECT USING (has_role(auth.uid(), 'motorista'));

CREATE POLICY "Motorista can update assignments for check-in" ON public.logistics_assignments
  FOR UPDATE USING (has_role(auth.uid(), 'motorista'));

-- Motorista can view franchises for logistics
CREATE POLICY "Motorista can view all franchises" ON public.franchises
  FOR SELECT USING (has_role(auth.uid(), 'motorista'));

-- Motorista can view sales for logistics
CREATE POLICY "Motorista can view all sales" ON public.sales
  FOR SELECT USING (has_role(auth.uid(), 'motorista'));