CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  post_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0
);

-- Index for quick lookup
CREATE INDEX idx_verification_email_code ON verification_codes(email, code);
CREATE INDEX idx_verification_expires ON verification_codes(expires_at);

-- Clean up old verification codes automatically
CREATE OR REPLACE FUNCTION cleanup_old_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;