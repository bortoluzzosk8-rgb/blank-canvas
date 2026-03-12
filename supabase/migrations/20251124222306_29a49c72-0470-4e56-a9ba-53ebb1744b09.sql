-- Add inventory_item_id to sale_items table
ALTER TABLE sale_items ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id);

-- Create function to check item availability
CREATE OR REPLACE FUNCTION check_item_availability(
  p_inventory_item_id UUID,
  p_rental_start_date DATE,
  p_party_start_time TIME,
  p_return_date DATE,
  p_exclude_sale_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_available BOOLEAN,
  conflicting_sale_id UUID,
  conflicting_client_name TEXT,
  conflicting_start_date DATE,
  conflicting_end_date DATE,
  conflicting_party_time TIME,
  conflicting_franchise_name TEXT,
  conflicting_franchise_city TEXT
) AS $$
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
        -- Check date overlap
        (s.rental_start_date, s.return_date) OVERLAPS (p_rental_start_date, p_return_date)
        OR
        -- Check same day with time conflict (less than 1 hour gap)
        (
          s.rental_start_date = p_rental_start_date 
          AND s.party_start_time IS NOT NULL 
          AND p_party_start_time IS NOT NULL
          AND ABS(EXTRACT(EPOCH FROM (s.party_start_time - p_party_start_time))) < 3600
        )
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;