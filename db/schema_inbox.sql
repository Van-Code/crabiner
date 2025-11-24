-- Drop email-related columns from posts table
ALTER TABLE posts DROP COLUMN IF EXISTS relay_email;
ALTER TABLE posts DROP COLUMN IF EXISTS contact_email_encrypted;

-- Add session token for poster to check their inbox
ALTER TABLE posts ADD COLUMN session_token VARCHAR(255) UNIQUE;

-- Update replies table for in-app messaging
ALTER TABLE replies DROP COLUMN IF EXISTS message_encrypted;
ALTER TABLE replies ADD COLUMN message TEXT NOT NULL;
ALTER TABLE replies ADD COLUMN replier_email VARCHAR(255) NOT NULL;
ALTER TABLE replies ADD COLUMN replier_session_token VARCHAR(255);

-- Indexes
CREATE INDEX idx_posts_session ON posts(session_token);
CREATE INDEX idx_replies_read ON replies(is_read);

-- Migration for existing data (if any)
UPDATE posts SET session_token = md5(random()::text) WHERE session_token IS NULL;