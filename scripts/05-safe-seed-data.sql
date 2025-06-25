-- Safely insert sample data only if it doesn't exist

-- Insert default template only if none exists
INSERT INTO certificate_templates (
    name, 
    background_url, 
    name_position, 
    qr_position, 
    name_style,
    qr_size,
    template_width,
    template_height
) 
SELECT 
    'Default Certificate Template',
    '/placeholder.svg?height=600&width=800',
    '{"x": 400, "y": 300}',
    '{"x": 650, "y": 500}',
    '{"fontSize": 36, "color": "#1a365d", "fontFamily": "Georgia", "fontWeight": "bold"}',
    100,
    800,
    600
WHERE NOT EXISTS (SELECT 1 FROM certificate_templates);

-- Insert sample participants only if none exist
INSERT INTO participants (name, email, college, role, verification_id) 
SELECT * FROM (VALUES 
    ('John Doe', 'john.doe@email.com', 'Stanford University', 'Participant', 'CERT-2024-001'),
    ('Jane Smith', 'jane.smith@email.com', 'MIT', 'Speaker', 'CERT-2024-002'),
    ('Bob Johnson', 'bob.johnson@email.com', 'Harvard University', 'Organizer', 'CERT-2024-003'),
    ('Alice Brown', 'alice.brown@email.com', 'UC Berkeley', 'Participant', 'CERT-2024-004')
) AS v(name, email, college, role, verification_id)
WHERE NOT EXISTS (SELECT 1 FROM participants WHERE verification_id = v.verification_id);
