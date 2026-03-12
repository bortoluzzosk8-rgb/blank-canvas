-- Recalcular o total_value de todas as vendas existentes
-- Total = soma dos itens + frete + (monitoria se with_monitoring = true)
UPDATE sales 
SET total_value = (
  SELECT COALESCE(SUM(total_value), 0) 
  FROM sale_items 
  WHERE sale_id = sales.id
) + COALESCE(freight_value, 0) + 
    CASE 
      WHEN with_monitoring = true THEN COALESCE(monitoring_value, 0) 
      ELSE 0 
    END;