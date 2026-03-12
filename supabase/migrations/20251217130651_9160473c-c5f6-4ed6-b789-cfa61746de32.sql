-- Tabela para atribuição diária de motorista por veículo
CREATE TABLE public.vehicle_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES logistics_vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  franchise_id UUID REFERENCES franchises(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, assignment_date)
);

-- Enable RLS
ALTER TABLE public.vehicle_driver_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Franqueadora can manage all vehicle_driver_assignments"
ON public.vehicle_driver_assignments
FOR ALL
USING (has_role(auth.uid(), 'franqueadora'));

CREATE POLICY "Franqueado can manage own franchise vehicle_driver_assignments"
ON public.vehicle_driver_assignments
FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Vendedor can manage all vehicle_driver_assignments"
ON public.vehicle_driver_assignments
FOR ALL
USING (has_role(auth.uid(), 'vendedor'));

CREATE POLICY "Motorista can view own vehicle_driver_assignments"
ON public.vehicle_driver_assignments
FOR SELECT
USING (driver_id IN (
  SELECT id FROM drivers WHERE user_id = auth.uid()
));