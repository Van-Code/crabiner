-- Migration: Convert to token-based authentication
-- This migration drops session-based auth and implements JWT + refresh tokens

-- Drop old session table
DROP TABLE IF EXISTS session CASCADE;

-- Drop old users table (we're recreating with new schema)
-- NOTE: This will cascade to saved_posts and posts.user_id
DROP TABLE IF EXISTS users CASCADE;

-- Create new users table with google_sub instead of google_id
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_users_email ON users(email);

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID,
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Recreate posts.user_id foreign key (posts table should exist from schema.sql)
-- First ensure the column exists, then add the constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Drop existing constraint if it exists
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Add new constraint
ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Recreate index
DROP INDEX IF EXISTS idx_posts_user;
CREATE INDEX idx_posts_user ON posts(user_id);

-- Recreate saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_saved_posts_user ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_post ON saved_posts(post_id);

-- Add replies.user_id foreign key if replies table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'replies') THEN
    -- Drop existing constraint if exists
    ALTER TABLE replies DROP CONSTRAINT IF EXISTS replies_user_id_fkey;

    -- Add new constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'replies' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE replies ADD CONSTRAINT replies_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
