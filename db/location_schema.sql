-- Add common locations for quick filtering
CREATE TABLE IF NOT EXISTS common_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  city VARCHAR(100),
  state VARCHAR(50),
  post_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_common_locations_name ON common_locations(name);
CREATE INDEX idx_common_locations_count ON common_locations(post_count DESC);

-- Seed common SF Bay Area locations
INSERT INTO common_locations (name, city, state) VALUES
('The Castro', 'San Francisco', 'CA'),
('Mission District', 'San Francisco', 'CA'),
('Dolores Park', 'San Francisco', 'CA'),
('Hayes Valley', 'San Francisco', 'CA'),
('Haight-Ashbury', 'San Francisco', 'CA'),
('North Beach', 'San Francisco', 'CA'),
('SOMA', 'San Francisco', 'CA'),
('Financial District', 'San Francisco', 'CA'),
('Noe Valley', 'San Francisco', 'CA'),
('Bernal Heights', 'San Francisco', 'CA'),
('Lake Merritt', 'Oakland', 'CA'),
('Telegraph Ave', 'Berkeley', 'CA'),
('Downtown Oakland', 'Oakland', 'CA'),
('Jack London Square', 'Oakland', 'CA'),
('Temescal', 'Oakland', 'CA')
ON CONFLICT (name) DO NOTHING;