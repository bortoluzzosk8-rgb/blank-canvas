-- Add parent_id column to expense_categories for subcategory hierarchy
ALTER TABLE expense_categories 
ADD COLUMN parent_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE;

-- Create index for better performance on parent_id queries
CREATE INDEX idx_expense_categories_parent_id ON expense_categories(parent_id);