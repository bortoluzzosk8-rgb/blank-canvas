ALTER TABLE sale_monitoring_slots
ADD COLUMN monitor_id uuid REFERENCES monitors(id) ON DELETE SET NULL;