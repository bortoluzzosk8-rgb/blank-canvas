-- Remover a constraint antiga
ALTER TABLE public.logistics_assignments 
DROP CONSTRAINT IF EXISTS logistics_assignments_assignment_type_check;

-- Criar nova constraint com todos os tipos permitidos
ALTER TABLE public.logistics_assignments 
ADD CONSTRAINT logistics_assignments_assignment_type_check 
CHECK (assignment_type = ANY (ARRAY[
  'montagem'::text, 
  'desmontagem'::text, 
  'saida_deposito'::text, 
  'volta_deposito'::text, 
  'pausa'::text
]));