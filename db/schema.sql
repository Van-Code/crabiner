-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  description TEXT NOT NULL,
  posted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  management_token_hash VARCHAR(255) NOT NULL,
  relay_email VARCHAR(100) UNIQUE NOT NULL,
  contact_email_encrypted TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_posts_expires ON posts(expires_at) WHERE is_deleted = FALSE;
CREATE INDEX idx_posts_location ON posts(location) WHERE is_deleted = FALSE;
CREATE INDEX idx_posts_posted_at ON posts(posted_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_relay_email ON posts(relay_email);

-- Optional: Replies table for in-app inbox (if not using email relay)
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  message_encrypted TEXT NOT NULL,
  replied_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_replies_post ON replies(post_id);
CREATE INDEX idx_replies_expires ON replies(expires_at);