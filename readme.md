# 🦔💕 Crabiner

A privacy-focused, safe space for **sapphic women and nonbinary people** to post and respond to missed connections. Built with security, anonymity, and community safety as top priorities.

> **This is a sapphic-only space.** Crabiner is exclusively for queer women, lesbians, and nonbinary folks seeking connections with other sapphics.

---

## ✨ Features

### **Core Functionality**

- 🔒 **Anonymous Posting** - No user accounts required
- 💌 **Private In-App Inbox** - Messages stored securely, never via email relay
- ⏰ **Auto-Expiring Posts** - Posts automatically delete after 7-30 days
- 🔗 **Magic Links** - Session-based inbox access (no passwords)
- 🚫 **No File Uploads** - Minimal attack surface

### **Communication**

- 💬 **Threaded Conversations** - Posters can reply to messages in-app
- 📧 **Email Notifications** - Optional alerts when you receive replies
- ✉️ **Email Verification** - Verify your email to receive your inbox link
- 🔔 **Reply Notifications** - Get notified when someone responds

### **Discovery**

- 🔍 **Full-Text Search** - Search posts by keywords
- 📍 **Location Filtering** - Browse by neighborhood/area with autocomplete
- 🏷️ **Category Tags** - Coffee shops, transit, bars, events, etc.
- ⭐ **Popular Searches** - See what others are looking for
- 📌 **Popular Locations** - Clickable location tags

### **Safety & Moderation**

- 🛡️ **Safe Words Filter** - Auto-flag concerning content (violence, scams, hate speech)
- 🚩 **Anonymous Reporting** - Flag inappropriate posts (completely anonymous)
- 🔄 **Auto-Moderation** - Posts auto-hide after 3+ reports
- 📊 **Moderation Queue** - Review flagged content
- 🔐 **Rate Limiting** - Prevents spam and abuse (5 posts/day, 20 replies/day)

### **Privacy by Design**

- No IP logging (rate limit only, then discarded)
- No tracking scripts or analytics
- Timestamps rounded to nearest hour
- Email addresses encrypted at rest
- All input sanitized against XSS
- HTTPS-only with strict CSP headers
- No cookies or persistent sessions (except opt-in)

---

## 🏳️‍🌈 Who Is This For?

**Crabiner is exclusively for:**

- Queer women (lesbians, bisexual women, pansexual women, etc.)
- Nonbinary people attracted to women/sapphics
- Trans women who are sapphic
- Anyone who identifies as sapphic/wlw (women-loving-women)

**This is NOT a space for:**

- Cisgender men (even allies)
- Straight women seeking men
- People seeking hookups with men
- Anyone looking to fetishize or objectify sapphics

If you're not sure if this space is for you, ask yourself: "Am I a sapphic person looking to connect with other sapphics?" If yes, you're welcome here! 💕

---

## 🛠️ Tech Stack

**Backend:**

- Node.js + Express
- PostgreSQL
- Nodemailer (email notifications)

**Frontend:**

- Vanilla HTML/CSS/JS (no framework)
- Responsive design
- Dark mode support

**Security:**

- Helmet.js
- express-rate-limit
- express-validator
- bcrypt (token hashing)
- AES-256-GCM encryption
- Content sanitization

---

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- SMTP server (SendGrid, AWS SES, Postfix, etc.)
- Domain with DNS access (optional, for production)

---

## 🚀 Installation

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd shy-porcupine
npm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb missed_connections

# Create user
psql postgres
CREATE USER mc_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE missed_connections TO mc_app;
ALTER DATABASE missed_connections OWNER TO mc_app;
\q

# Run all schema files
psql -U mc_app -d missed_connections -f db/schema.sql
psql -U mc_app -d missed_connections -f db/schema_inbox.sql
psql -U mc_app -d missed_connections -f db/verification_schema.sql
psql -U mc_app -d missed_connections -f db/poster_verification_schema.sql
psql -U mc_app -d missed_connections -f db/moderation_schema.sql
psql -U mc_app -d missed_connections -f db/seed_safe_words.sql
psql -U mc_app -d missed_connections -f db/search_schema.sql
psql -U mc_app -d missed_connections -f db/threading_schema.sql
psql -U mc_app -d missed_connections -f db/location_schema.sql
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

**Required Environment Variables:**

```bash
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://db_user:your_password@localhost:5432/db_name

# Email (AWS SES example)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_smtp_username
SMTP_PASS=your_aws_smtp_password
SMTP_FROM=noreply@shyporcupine.com
RELAY_DOMAIN=shyporcupine.com

# Security (generate random 32+ character string)
ENCRYPTION_KEY=your_32_byte_encryption_key_here_change_this
ALLOWED_ORIGINS=http://localhost:3000,crabiner.vercel.app

# Rate Limiting
MAX_POSTS_PER_DAY=5
MAX_REPLIES_PER_DAY=20

# Cleanup Job (cron format)
CLEANUP_CRON=0 * * * *
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

Visit http://localhost:3000

---

## 🔧 Production Deployment

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start src/server.js --name shy-porcupine
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name shyporcupine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shyporcupine.com;

    ssl_certificate /etc/letsencrypt/live/shyporcupine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shyporcupine.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Get SSL certificate:

```bash
sudo certbot --nginx -d shyporcupine.com
```

---

## 📊 Database Maintenance

### Automated Backups

```bash
# Add to crontab
0 2 * * * pg_dump -U mc_app missed_connections | gzip > /backups/mc_$(date +\%Y\%m\%d).sql.gz
```

### Manual Cleanup

```bash
npm run cleanup
```

---

## 📝 API Documentation

### GET /api/posts

List all active posts (paginated)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `location` (optional): Filter by location

### GET /api/posts/search

Search posts by keywords

**Query Parameters:**

- `q`: Search query
- `page` (optional): Page number
- `location` (optional): Filter by location
- `category` (optional): Filter by category

### GET /api/posts/locations

Get popular locations with post counts

### GET /api/posts/:id

Get single post details

### POST /api/posts

Create new post (rate limited: 5/day per IP)

**Body:**

```json
{
  "location": "The Castro, SF",
  "category": "coffee-shop",
  "description": "You were reading a book...",
  "expiresInDays": 14
}
```

### POST /api/verification/request

Request email verification code for replying

### POST /api/verification/verify

Verify code and send reply

### POST /api/moderation/report

Report a post (anonymous)

### GET /api/inbox/:sessionToken

Get inbox messages (threaded)

### POST /api/inbox/:sessionToken/messages/:replyId/reply

Poster replies to a message

---

## 🛡️ Security Features

### What This App Does

✅ Encrypts contact emails at rest  
✅ Auto-deletes old posts  
✅ Rate limits all actions  
✅ Sanitizes all user input  
✅ No file uploads  
✅ Minimal metadata collection  
✅ Strict CSP headers  
✅ Safe words content filtering  
✅ Anonymous reporting system  
✅ Auto-moderation (3 reports = hide)

### What This App Doesn't Do

❌ Store IP addresses long-term  
❌ Track user behavior  
❌ Use cookies (except opt-in)  
❌ Log email content  
❌ Share data with third parties  
❌ Require user accounts

---

## 🤝 Contributing

This is a community-focused project. Contributions welcome!

**Priority Areas:**

- Improved moderation tools
- Better spam prevention
- Accessibility improvements
- Mobile app
- Translations

**Please ensure:**

- Privacy-first approach maintained
- No tracking/analytics added
- Security reviewed
- Sapphic-only space respected

---

## 📜 Community Guidelines

**Please review our [Community Guidelines](COMMUNITY_GUIDELINES.md)** before posting.

---

## 📄 License

MIT License - feel free to use, modify, and deploy

---

## 💖 Acknowledgments

Built with care for the sapphic community. Special thanks to everyone who believes in creating safer digital spaces for queer women and nonbinary folks.

---

## 🔗 Resources

- [OWASP Secure Coding](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## 📧 Support

For issues, questions, or suggestions, please open a GitHub issue.

**Remember:** This platform is about connection, consent, and community. Please use it respectfully and help keep it safe for everyone. 🦔💕🏳️‍🌈

---
