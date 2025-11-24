-- Add full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_description_search 
ON posts USING gin(to_tsvector('english', description));

CREATE INDEX IF NOT EXISTS idx_posts_location_search 
ON posts USING gin(to_tsvector('english', location));

-- Search history (optional - for popular searches)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INT,
  searched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_queries_query ON search_queries(query);