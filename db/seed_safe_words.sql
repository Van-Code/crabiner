-- Insert common safe words to flag
INSERT INTO safe_words (word, category, severity, action) VALUES
-- High severity - violence/harm
('kill', 'violence', 'high', 'review'),
('suicide', 'violence', 'high', 'review'),
('murder', 'violence', 'high', 'review'),
('weapon', 'violence', 'medium', 'flag'),
('gun', 'violence', 'medium', 'flag'),

-- High severity - drugs/illegal
('cocaine', 'drugs', 'high', 'review'),
('heroin', 'drugs', 'high', 'review'),
('meth', 'drugs', 'high', 'review'),
('dealer', 'drugs', 'medium', 'flag'),
('selling drugs', 'drugs', 'high', 'review'),

-- Medium severity - scams
('send money', 'scam', 'medium', 'flag'),
('wire transfer', 'scam', 'medium', 'flag'),
('cash app', 'scam', 'low', 'flag'),
('venmo me', 'scam', 'low', 'flag'),
('sugar daddy', 'scam', 'medium', 'flag'),
('financial help', 'scam', 'low', 'flag'),

-- Medium severity - explicit sexual content
('nude pics', 'explicit', 'medium', 'flag'),
('send nudes', 'explicit', 'medium', 'flag'),
('dick pic', 'explicit', 'high', 'review'),
('sex for', 'explicit', 'high', 'review'),
('hookup only', 'explicit', 'low', 'flag'),

-- Low severity - spam indicators
('click here', 'spam', 'low', 'flag'),
('buy now', 'spam', 'low', 'flag'),
('limited time', 'spam', 'low', 'flag'),
('act now', 'spam', 'low', 'flag'),

-- Hate speech (high severity)
('terf', 'hate', 'high', 'review'),
('tranny', 'hate', 'high', 'review'),
('dyke', 'hate', 'medium', 'flag'), -- Can be reclaimed but flag for review

-- Minor safety
('under 18', 'minor', 'high', 'review'),
('underage', 'minor', 'high', 'review'),
('high school', 'minor', 'medium', 'flag'),

-- Harassment
('stalking', 'harassment', 'high', 'review'),
('following you', 'harassment', 'medium', 'flag'),
('watching you', 'harassment', 'medium', 'flag')

ON CONFLICT (word) DO NOTHING;