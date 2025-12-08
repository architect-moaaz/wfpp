-- Migration: Add gridLayout column to forms table
-- This column stores react-grid-layout coordinates for form fields

ALTER TABLE k1.forms
ADD COLUMN IF NOT EXISTS grid_layout jsonb DEFAULT '[]'::jsonb;

-- Create an index on grid_layout for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_grid_layout ON k1.forms USING gin(grid_layout);

-- Add comment to describe the column
COMMENT ON COLUMN k1.forms.grid_layout IS 'React-grid-layout coordinates for form fields (array of {i, x, y, w, h, minW, minH})';
