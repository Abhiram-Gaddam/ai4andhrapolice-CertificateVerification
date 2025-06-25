-- Insert sample certificate template (updated to work with existing schema)
INSERT INTO certificate_templates (
  name, 
  background_url, 
  name_position, 
  qr_position, 
  name_style,
  qr_size,
  template_width,
  template_height
) VALUES (
  'Default Certificate Template',
  '/placeholder.svg?height=600&width=800',
  '{"x": 400, "y": 300}',
  '{"x": 650, "y": 500}',
  '{"fontSize": 36, "color": "#1a365d", "fontFamily": "Georgia", "fontWeight": "bold"}',
  100,
  800,
  600
) ON CONFLICT DO NOTHING;

-- Insert sample participants with realistic data (without event column)
INSERT INTO participants (name, email, college, role, verification_id) VALUES 
('John Doe', 'john.doe@email.com', 'Stanford University', 'Participant', 'CERT-2024-001'),
('Jane Smith', 'jane.smith@email.com', 'MIT', 'Speaker', 'CERT-2024-002'),
('Bob Johnson', 'bob.johnson@email.com', 'Harvard University', 'Organizer', 'CERT-2024-003'),
('Alice Brown', 'alice.brown@email.com', 'UC Berkeley', 'Participant', 'CERT-2024-004'),
('Charlie Wilson', 'charlie.wilson@email.com', 'Caltech', 'Volunteer', 'CERT-2024-005'),
('Diana Prince', 'diana.prince@email.com', 'Yale University', 'Speaker', 'CERT-2024-006'),
('Edward Norton', 'edward.norton@email.com', 'Princeton University', 'Participant', 'CERT-2024-007'),
('Fiona Green', 'fiona.green@email.com', 'Columbia University', 'Mentor', 'CERT-2024-008')
ON CONFLICT (verification_id) DO NOTHING;

-- Insert sample QR scan logs for analytics
INSERT INTO qr_scan_logs (participant_id, scanned_at, ip_address, user_agent) VALUES 
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-001'), NOW() - INTERVAL '1 day', '192.168.1.100', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-002'), NOW() - INTERVAL '2 days', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-001'), NOW() - INTERVAL '3 days', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-003'), NOW() - INTERVAL '1 hour', '192.168.1.103', 'Mozilla/5.0 (Android 11; Mobile; rv:68.0)'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-004'), NOW() - INTERVAL '30 minutes', '192.168.1.104', 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-005'), NOW() - INTERVAL '15 minutes', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0)'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-002'), NOW() - INTERVAL '5 minutes', '192.168.1.106', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
ON CONFLICT DO NOTHING;

-- Insert sample certificate generation logs
INSERT INTO certificate_logs (participant_id, template_id, generation_type, status) VALUES 
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-001'), (SELECT id FROM certificate_templates LIMIT 1), 'manual', 'completed'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-002'), (SELECT id FROM certificate_templates LIMIT 1), 'bulk', 'completed'),
((SELECT id FROM participants WHERE verification_id = 'CERT-2024-003'), (SELECT id FROM certificate_templates LIMIT 1), 'bulk', 'completed')
ON CONFLICT DO NOTHING;
