-- Add installment fields to expenses table
ALTER TABLE expenses ADD COLUMN installments INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN installment_number INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN due_date DATE;
ALTER TABLE expenses ADD COLUMN parent_expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE;