-- Reports table for flagged posts
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  reporter_ip_hash VARCHAR(64), -- Hashed for privacy
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  action_taken VARCHAR(50) -- deleted, warned, no_action
);

CREATE INDEX idx_reports_post ON reports(post_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Flagged words/phrases detection log
CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  flag_type VARCHAR(50) NOT NULL, -- safe_word, spam, profanity
  matched_pattern TEXT,
  severity VARCHAR(20), -- low, medium, high
  auto_action VARCHAR(50), -- none, review_required, auto_hidden
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_flags_post ON content_flags(post_id);
CREATE INDEX idx_content_flags_severity ON content_flags(severity);

-- Blocked posts (soft delete with reason)
CREATE TABLE IF NOT EXISTS blocked_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT,
  blocked_by VARCHAR(100), -- 'system' or moderator name
  blocked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blocked_posts_post ON blocked_posts(post_id);

-- Safe words configuration
CREATE TABLE IF NOT EXISTS safe_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  category VARCHAR(50), -- violence, drugs, explicit, scam, etc.
  severity VARCHAR(20), -- low, medium, high
  action VARCHAR(50), -- flag, review, block
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_safe_words_active ON safe_words(is_active);
CREATE INDEX idx_safe_words_category ON safe_words(category);