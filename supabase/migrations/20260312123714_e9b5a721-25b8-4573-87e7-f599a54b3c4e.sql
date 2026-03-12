
-- Drop the version with p_rental_type parameter
DROP FUNCTION IF EXISTS public.check_item_availability(uuid, date, time, date, uuid, text);

-- Recreate the main version using party_start_time and return_time with 1h buffer
CREATE OR REPLACE FUNCTION public.check_item_availability(
  p_inventory_item_id uuid, 
  p_rental_start_date date, 
  p_party_start_time time without time zone, 
  p_return_date date, 
  p_exclude_sale_id uuid DEFAULT NULL::uuid
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
          -- Same day + both have start and return times: check time overlap with 1h buffer after return
          WHEN s.rental_start_date = s.return_date 
               AND p_rental_start_date = p_return_date
               AND s.rental_start_date = p_rental_start_date
               AND s.party_start_time IS NOT NULL 
               AND s.return_time IS NOT NULL
               AND p_party_start_time IS NOT NULL THEN
            -- Existing block: party_start_time to return_time + 1h buffer
            -- New block: p_party_start_time to end of event
            (p_party_start_time, COALESCE(p_party_start_time + interval '1 hour', p_party_start_time)) 
            OVERLAPS 
            (s.party_start_time, s.return_time + interval '1 hour')
            OR
            p_party_start_time >= s.party_start_time AND p_party_start_time < s.return_time + interval '1 hour'

          -- Same start date, both have party times but no return times: check 1h gap
          WHEN s.rental_start_date = p_rental_start_date
               AND s.party_start_time IS NOT NULL 
               AND p_party_start_time IS NOT NULL THEN
            ABS(EXTRACT(EPOCH FROM (s.party_start_time - p_party_start_time))) < 3600

          -- Standard date overlap check
          ELSE
            (s.rental_start_date, COALESCE(s.return_date, s.rental_start_date)) 
            OVERLAPS 
            (p_rental_start_date, COALESCE(p_return_date, p_rental_start_date))
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
