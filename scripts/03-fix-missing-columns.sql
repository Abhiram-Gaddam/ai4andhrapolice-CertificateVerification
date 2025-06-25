-- Fix missing columns in existing tables

-- Add missing columns to certificate_templates if they don't exist
DO $$ 
BEGIN
  -- Add qr_size column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'certificate_templates' 
                 AND column_name = 'qr_size') THEN
    ALTER TABLE certificate_templates ADD COLUMN qr_size INTEGER DEFAULT 120;
    RAISE NOTICE 'Added qr_size column to certificate_templates';
  END IF;

  -- Add template_width column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'certificate_templates' 
                 AND column_name = 'template_width') THEN
    ALTER TABLE certificate_templates ADD COLUMN template_width INTEGER DEFAULT 800;
    RAISE NOTICE 'Added template_width column to certificate_templates';
  END IF;

  -- Add template_height column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'certificate_templates' 
                 AND column_name = 'template_height') THEN
    ALTER TABLE certificate_templates ADD COLUMN template_height INTEGER DEFAULT 600;
    RAISE NOTICE 'Added template_height column to certificate_templates';
  END IF;

  -- Update existing records to have default values
  UPDATE certificate_templates 
  SET qr_size = 120 
  WHERE qr_size IS NULL;

  UPDATE certificate_templates 
  SET template_width = 800 
  WHERE template_width IS NULL;

  UPDATE certificate_templates 
  SET template_height = 600 
  WHERE template_height IS NULL;

  RAISE NOTICE 'Updated existing certificate_templates with default values';
END $$;
