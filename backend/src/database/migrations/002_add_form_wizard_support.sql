-- ============================================================================
-- Migration: Add Wizard Form Support
-- Description: Adds columns to k1.forms table to support wizard-style forms
-- Created: 2025-11-27
-- ============================================================================

-- Add new columns to forms table for wizard support
ALTER TABLE k1.forms
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS form_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS node_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';

-- Add index for form_type for faster queries
CREATE INDEX IF NOT EXISTS idx_forms_type ON k1.forms(form_type);

-- Add comment
COMMENT ON COLUMN k1.forms.steps IS 'For wizard forms: array of step objects with fields, title, and description';
COMMENT ON COLUMN k1.forms.form_type IS 'Form type: standard, wizard, multi-step, etc.';
COMMENT ON COLUMN k1.forms.node_id IS 'Reference to workflow node that uses this form';
COMMENT ON COLUMN k1.forms.title IS 'Display title for the form';
