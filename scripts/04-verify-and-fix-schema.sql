-- Verify and fix database schema safely
-- This script checks the current state and only makes necessary changes

-- First, let's check what exists
DO $$ 
DECLARE
    table_exists boolean;
    col_exists boolean;
BEGIN
    -- Check if certificate_templates table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'certificate_templates'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Creating certificate_templates table...';
        CREATE TABLE certificate_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            background_url TEXT NOT NULL,
            name_position JSONB DEFAULT '{"x": 300, "y": 400}',
            qr_position JSONB DEFAULT '{"x": 600, "y": 500}',
            name_style JSONB DEFAULT '{"fontSize": 32, "color": "#000000", "fontFamily": "Arial", "fontWeight": "bold"}',
            qr_size INTEGER DEFAULT 120,
            template_width INTEGER DEFAULT 800,
            template_height INTEGER DEFAULT 600,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'certificate_templates table already exists';
        
        -- Check and add missing columns one by one
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'certificate_templates' AND column_name = 'qr_size'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE certificate_templates ADD COLUMN qr_size INTEGER DEFAULT 120;
            RAISE NOTICE 'Added qr_size column';
        END IF;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'certificate_templates' AND column_name = 'template_width'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE certificate_templates ADD COLUMN template_width INTEGER DEFAULT 800;
            RAISE NOTICE 'Added template_width column';
        END IF;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'certificate_templates' AND column_name = 'template_height'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE certificate_templates ADD COLUMN template_height INTEGER DEFAULT 600;
            RAISE NOTICE 'Added template_height column';
        END IF;
    END IF;
    
    -- Ensure participants table exists (keeping existing structure)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'participants'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        CREATE TABLE participants (
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
        RAISE NOTICE 'Created participants table';
    END IF;
    
    -- Ensure other tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_scan_logs'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        CREATE TABLE qr_scan_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
            scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ip_address INET,
            user_agent TEXT,
            location JSONB,
            referrer TEXT
        );
        RAISE NOTICE 'Created qr_scan_logs table';
    END IF;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'certificate_logs'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        CREATE TABLE certificate_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
            template_id UUID REFERENCES certificate_templates(id),
            generation_type VARCHAR(50) DEFAULT 'manual',
            status VARCHAR(50) DEFAULT 'pending',
            error_message TEXT,
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created certificate_logs table';
    END IF;
    
    RAISE NOTICE 'Database schema verification complete';
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_participants_verification_id ON participants(verification_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_participant_id ON qr_scan_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_participant_id ON certificate_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_generated_at ON certificate_logs(generated_at);
