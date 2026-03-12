-- Add subscription fields to franchises table
ALTER TABLE public.franchises 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (NOW() + INTERVAL '10 days'),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT NULL;

-- Update existing franchises to have trial_ends_at set (10 days from their creation)
UPDATE public.franchises 
SET trial_ends_at = created_at + INTERVAL '10 days'
WHERE trial_ends_at IS NULL;