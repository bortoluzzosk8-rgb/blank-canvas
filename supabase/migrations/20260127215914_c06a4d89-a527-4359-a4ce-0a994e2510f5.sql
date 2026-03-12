-- Adicionar coluna para identificar franquia pai (raiz do cliente SaaS)
ALTER TABLE public.franchises 
ADD COLUMN parent_franchise_id UUID REFERENCES public.franchises(id);

-- Índice para performance em buscas hierárquicas
CREATE INDEX idx_franchises_parent ON public.franchises(parent_franchise_id);

-- Comentário explicativo
COMMENT ON COLUMN public.franchises.parent_franchise_id IS 'Se NULL, é uma franquia raiz (cliente SaaS principal). Se preenchido, é uma unidade filha.';
