-- Create system_updates table for storing system update announcements
CREATE TABLE public.system_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  version text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

-- Super Admin can manage all updates
CREATE POLICY "Super Admin can manage all updates"
  ON public.system_updates FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Authenticated users can view active updates
CREATE POLICY "Authenticated users can view active updates"
  ON public.system_updates FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_system_updates_updated_at
  BEFORE UPDATE ON public.system_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();