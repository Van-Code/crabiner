-- Add email and notification preferences to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poster_email VARCHAR(255);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poster_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS notify_on_reply BOOLEAN DEFAULT FALSE;

-- Create poster verification codes table
CREATE TABLE IF NOT EXISTS poster_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0
);

CREATE INDEX idx_poster_verification_email ON poster_verification_codes(email, code);
CREATE INDEX idx_poster_verification_expires ON poster_verification_codes(expires_at);