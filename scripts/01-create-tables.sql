-- Smart Certificate Generator Database Schema

-- Certificate templates table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  background_url TEXT NOT NULL,
  name_position JSONB DEFAULT '{"x": 300, "y": 400}',
  qr_position JSONB DEFAULT '{"x": 600, "y": 500}',
  name_style JSONB DEFAULT '{"fontSize": 32, "color": "#000000", "fontFamily": "Arial", "fontWeight": "bold"}',
  template_width INTEGER DEFAULT 800,
  template_height INTEGER DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add qr_size column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'certificate_templates' 
                 AND column_name = 'qr_size') THEN
    ALTER TABLE certificate_templates ADD COLUMN qr_size INTEGER DEFAULT 120;
  END IF;
END $$;

-- Participants table (without event column to match existing schema)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  college VARCHAR(255),
  role VARCHAR(255),
  verification_id VARCHAR(255) UNIQUE NOT NULL,
  certificate_url TEXT,
  qr_code_url TEXT,
  certificate_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR scan logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  referrer TEXT
);

-- Certificate generation logs
CREATE TABLE IF NOT EXISTS certificate_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id),
  generation_type VARCHAR(50) DEFAULT 'manual', -- 'bulk' or 'manual'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk upload sessions
CREATE TABLE IF NOT EXISTS bulk_upload_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255),
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_verification_id ON participants(verification_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_participant_id ON qr_scan_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_participant_id ON certificate_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_generated_at ON certificate_logs(generated_at);
