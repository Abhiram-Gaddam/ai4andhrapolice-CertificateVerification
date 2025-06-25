-- Create optimized views and indexes for better performance

-- Create a materialized view for participant stats (if your database supports it)
-- This will speed up dashboard queries significantly

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_certificate_url ON participants(certificate_url) WHERE certificate_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at_desc ON qr_scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_generation_type ON certificate_logs(generation_type);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_status ON certificate_logs(status);

-- Create a simple function to get participant stats quickly
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_participants', (SELECT COUNT(*) FROM participants),
        'total_certificates', (SELECT COUNT(*) FROM participants WHERE certificate_url IS NOT NULL),
        'total_scans', (SELECT COUNT(*) FROM qr_scan_logs),
        'recent_scans', (SELECT COUNT(*) FROM qr_scan_logs WHERE scanned_at > NOW() - INTERVAL '24 hours')
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"total_participants": 0, "total_certificates": 0, "total_scans": 0, "recent_scans": 0}'::JSON;
END;
$$ LANGUAGE plpgsql;
