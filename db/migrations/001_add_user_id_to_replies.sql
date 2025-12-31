-- Migration: Add user_id to replies table for authenticated replies
-- This migration adds user authentication support for replies

-- Add user_id column to replies table
ALTER TABLE replies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_replies_user ON replies(user_id);

-- Add index on posted_at for sorting
CREATE INDEX IF NOT EXISTS idx_posts_posted_at_desc ON posts(posted_at DESC) WHERE is_deleted = FALSE;

-- Add index on expires_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(expires_at) WHERE is_deleted = FALSE AND expires_at > NOW();

-- Note: Existing replies will have NULL user_id (legacy anonymous replies)
-- New replies will require user_id (enforced by application logic)
