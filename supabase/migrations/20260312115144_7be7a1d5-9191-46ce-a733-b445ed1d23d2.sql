
-- Add rental_type column to sales table
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS rental_type text NOT NULL DEFAULT 'diaria';

-- Update check_item_availability function to handle 4-hour rentals with 1-hour buffer
CREATE OR REPLACE FUNCTION public.check_item_availability(
  p_inventory_item_id uuid, 
  p_rental_start_date date, 
  p_party_start_time time without time zone, 
  p_return_date date, 
  p_exclude_sale_id uuid DEFAULT NULL::uuid,
  p_rental_type text DEFAULT 'diaria'
)
RETURNS TABLE(
  is_available boolean, 
  conflicting_sale_id uuid, 
  conflicting_client_name text, 
  conflicting_start_date date, 
  conflicting_end_date date, 
  conflicting_party_time time without time zone, 
  conflicting_franchise_name text, 
  conflicting_franchise_city text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH conflicts AS (
    SELECT 
      s.id,
      s.client_name,
      s.rental_start_date,
      s.return_date,
      s.party_start_time,
      f.name as franchise_name,
      f.city as franchise_city
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN franchises f ON f.id = s.franchise_id
    WHERE si.inventory_item_id = p_inventory_item_id
      AND s.status != 'cancelled'
      AND (p_exclude_sale_id IS NULL OR s.id != p_exclude_sale_id)
      AND (
        CASE
          -- Both are 4-hour rentals on the same day: check time overlap with 1h buffer
          WHEN p_rental_type = '4horas' AND COALESCE(s.rental_type, 'diaria') = '4horas' 
               AND s.rental_start_date = p_rental_start_date THEN
            -- New rental time block: party_start_time to party_start_time + 5h (4h rental + 1h buffer)
            -- Existing rental time block: s.party_start_time to s.party_start_time + 5h
            s.party_start_time IS NOT NULL 
            AND p_party_start_time IS NOT NULL
            AND (p_party_start_time, p_party_start_time + interval '5 hours') 
                OVERLAPS 
                (s.party_start_time, s.party_start_time + interval '5 hours')
          
          -- New is 4-hour, existing is daily (or vice versa): daily blocks entire day
          -- If dates overlap at all, it's a conflict
          WHEN p_rental_type = '4horas' AND COALESCE(s.rental_type, 'diaria') = 'diaria' THEN
            s.rental_start_date <= p_return_date AND s.return_date >= p_rental_start_date
          
          WHEN p_rental_type = 'diaria' AND COALESCE(s.rental_type, 'diaria') = '4horas' THEN
            s.rental_start_date <= p_return_date AND s.return_date >= p_rental_start_date
          
          -- Both are daily: standard date overlap check
          ELSE
            (s.rental_start_date, s.return_date) OVERLAPS (p_rental_start_date, p_return_date)
            OR
            (
              s.rental_start_date = p_rental_start_date 
              AND s.party_start_time IS NOT NULL 
              AND p_party_start_time IS NOT NULL
              AND ABS(EXTRACT(EPOCH FROM (s.party_start_time - p_party_start_time))) < 3600
            )
        END
      )
    LIMIT 1
  )
  SELECT 
    NOT EXISTS(SELECT 1 FROM conflicts) as is_available,
    c.id,
    c.client_name,
    c.rental_start_date,
    c.return_date,
    c.party_start_time,
    c.franchise_name,
    c.franchise_city
  FROM conflicts c
  UNION ALL
  SELECT 
    true as is_available,
    NULL::UUID,
    NULL::TEXT,
    NULL::DATE,
    NULL::DATE,
    NULL::TIME,
    NULL::TEXT,
    NULL::TEXT
  WHERE NOT EXISTS(SELECT 1 FROM conflicts);
END;
$function$;
