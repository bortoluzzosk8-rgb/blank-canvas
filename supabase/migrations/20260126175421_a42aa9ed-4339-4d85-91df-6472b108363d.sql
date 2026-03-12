-- Criar tabela de monitores
CREATE TABLE public.monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados visualizarem todos os monitores
CREATE POLICY "Usuarios autenticados podem ver monitores" 
ON public.monitors FOR SELECT 
TO authenticated 
USING (true);

-- Política para franqueadora gerenciar todos os monitores
CREATE POLICY "Franqueadora pode gerenciar monitores" 
ON public.monitors FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'franqueadora'));

-- Política para franqueado gerenciar monitores da sua unidade
CREATE POLICY "Franqueado pode gerenciar monitores da sua unidade" 
ON public.monitors FOR ALL 
TO authenticated 
USING (
  franchise_id = public.get_user_franchise_id(auth.uid())
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_monitors_updated_at
BEFORE UPDATE ON public.monitors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();