-- Add rental_value column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN rental_value numeric DEFAULT 0;

-- Add rental_value to inventory_archive as well for consistency
ALTER TABLE public.inventory_archive 
ADD COLUMN rental_value numeric DEFAULT 0;