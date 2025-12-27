ALTER TABLE posts ADD COLUMN author_email TEXT;
CREATE INDEX posts_author_email_idx ON posts(author_email);