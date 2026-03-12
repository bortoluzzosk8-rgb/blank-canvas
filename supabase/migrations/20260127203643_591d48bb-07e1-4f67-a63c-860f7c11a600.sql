-- Add user_id column to clients table to link authenticated users
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Add RLS policy for users to view and update their own client record
CREATE POLICY "Users can view own client record"
ON public.clients
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own client record"
ON public.clients
FOR UPDATE
USING (user_id = auth.uid());