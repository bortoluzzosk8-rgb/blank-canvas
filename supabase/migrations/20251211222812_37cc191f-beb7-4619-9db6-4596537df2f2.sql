-- Tabela para cadastrar veículos da logística
CREATE TABLE public.logistics_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plate TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para atribuir entregas/retiradas aos veículos
CREATE TABLE public.logistics_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.logistics_vehicles(id) ON DELETE SET NULL,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('montagem', 'desmontagem')),
  scheduled_time TIME NOT NULL,
  order_position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_logistics_vehicles_franchise ON public.logistics_vehicles(franchise_id);
CREATE INDEX idx_logistics_assignments_date ON public.logistics_assignments(assignment_date);
CREATE INDEX idx_logistics_assignments_vehicle ON public.logistics_assignments(vehicle_id);
CREATE INDEX idx_logistics_assignments_sale ON public.logistics_assignments(sale_id);

-- Enable RLS
ALTER TABLE public.logistics_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para logistics_vehicles
CREATE POLICY "Franqueadora can manage all vehicles"
ON public.logistics_vehicles FOR ALL
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can manage own franchise vehicles"
ON public.logistics_vehicles FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM public.user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Vendedor can view all vehicles"
ON public.logistics_vehicles FOR SELECT
USING (has_role(auth.uid(), 'vendedor'::app_role));

-- RLS Policies para logistics_assignments
CREATE POLICY "Franqueadora can manage all assignments"
ON public.logistics_assignments FOR ALL
USING (has_role(auth.uid(), 'franqueadora'::app_role));

CREATE POLICY "Franqueado can manage own franchise assignments"
ON public.logistics_assignments FOR ALL
USING (franchise_id IN (
  SELECT franchise_id FROM public.user_franchises WHERE user_id = auth.uid()
));

CREATE POLICY "Vendedor can manage all assignments"
ON public.logistics_assignments FOR ALL
USING (has_role(auth.uid(), 'vendedor'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_logistics_vehicles_updated_at
BEFORE UPDATE ON public.logistics_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_logistics_assignments_updated_at
BEFORE UPDATE ON public.logistics_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();