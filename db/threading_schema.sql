ALTER TABLE replies ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES replies(id) ON DELETE CASCADE;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS is_from_poster BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_replies_parent ON replies(parent_reply_id);
CREATE INDEX idx_replies_poster ON replies(is_from_poster);