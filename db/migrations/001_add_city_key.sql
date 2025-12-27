-- Migration: Add city_key column to posts table
-- This enables structured city filtering and mapping

-- Add city_key column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS city_key VARCHAR(50);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_posts_city_key ON posts(city_key) WHERE is_deleted = FALSE;

-- Backfill city_key from existing location data (best effort mapping)
-- Map common locations to city keys
UPDATE posts SET city_key = 'sf' WHERE location ILIKE '%san francisco%' OR location ILIKE '%castro%' OR location ILIKE '%mission%' OR location ILIKE '%dolores%' OR location ILIKE '%hayes%' OR location ILIKE '%haight%' OR location ILIKE '%soma%' OR location ILIKE '%financial%' OR location ILIKE '%noe%' OR location ILIKE '%bernal%' OR location ILIKE '%potrero%' OR location ILIKE '%richmond%' OR location ILIKE '%sunset%' OR location ILIKE '%north beach%' OR location ILIKE '%cole valley%';
UPDATE posts SET city_key = 'oakland' WHERE city_key IS NULL AND (location ILIKE '%oakland%' OR location ILIKE '%lake merritt%' OR location ILIKE '%temescal%' OR location ILIKE '%jack london%');
UPDATE posts SET city_key = 'berkeley' WHERE city_key IS NULL AND (location ILIKE '%berkeley%' OR location ILIKE '%telegraph ave%');
UPDATE posts SET city_key = 'sanjose' WHERE city_key IS NULL AND location ILIKE '%san jose%';
UPDATE posts SET city_key = 'alameda' WHERE city_key IS NULL AND location ILIKE '%alameda%';
UPDATE posts SET city_key = 'walnutcreek' WHERE city_key IS NULL AND location ILIKE '%walnut creek%';

-- Default any remaining to 'sf' for now (can be updated manually if needed)
UPDATE posts SET city_key = 'sf' WHERE city_key IS NULL;
