-- Add received_by column to sale_payments table
ALTER TABLE sale_payments 
ADD COLUMN received_by TEXT CHECK (received_by IN ('franqueadora', 'franqueado'));