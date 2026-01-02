# Database Setup and Management

This guide provides exact commands to reset, seed, and manage the Crabiner database.

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js 18 or higher
- `.env` file configured with `DATABASE_URL`

## Quick Start

```bash
# 1. Drop and recreate database
npm run db:reset

# 2. Apply schema
npm run db:schema

# 3. Seed with test data
npm run db:seed

# 4. Run tests
npm test

# 5. Start API
npm start
```

## Detailed Commands

### 1. Database Reset (Drop and Recreate)

**⚠️ WARNING: This destroys all data!**

```bash
# Connect to PostgreSQL and drop/create database
psql -U postgres -c "DROP DATABASE IF EXISTS crabiner;"
psql -U postgres -c "CREATE DATABASE crabiner;"
```

Or use the npm script:

```bash
npm run db:reset
```

### 2. Apply Schema

Apply the clean schema to create all tables:

```bash
psql $DATABASE_URL < db/schema.sql
```

Or use the npm script:

```bash
npm run db:schema
```

### 3. Seed Database

Populate the database with test data (users, posts, replies, notifications):

```bash
node db/seed.js
```

Or use the npm script:

```bash
npm run db:seed
```

The seed data includes:
- 5 test users
- 15 posts (3 expired, 12 active)
- Multiple replies with varying read/unread states
- Notifications for each reply

### 4. Run Tests

Run all tests:

```bash
npm test
```

Run specific test suites:

```bash
# Auth tests
npm run test:auth

# Notification tests
node --test tests/notifications.test.js

# Token auth tests
npm run test:token-auth
```

### 5. Start API Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

With rate limiting disabled (for testing):

```bash
npm run dev:test
```

## Complete Reset Flow

To completely reset and rebuild your database:

```bash
# 1. Reset database
psql -U postgres << EOF
DROP DATABASE IF EXISTS crabiner;
CREATE DATABASE crabiner;
EOF

# 2. Apply schema
psql $DATABASE_URL < db/schema.sql

# 3. Seed data
node db/seed.js

# 4. Verify with tests
npm test

# 5. Start server
npm start
```

## Database Schema

The database includes the following tables:

- **users** - User accounts with Google OAuth
- **posts** - User posts with expiration
- **replies** - Replies to posts with read tracking
- **refresh_tokens** - JWT refresh token storage
- **user_push_tokens** - Push notification tokens
- **notifications** - In-app notifications

### Schema Features

- ✅ No legacy session tables
- ✅ Clean UUID primary keys
- ✅ Proper foreign key relationships
- ✅ Optimized indexes for queries
- ✅ TIMESTAMPTZ for all timestamps

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crabiner

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret_here
REFRESH_COOKIE_NAME=refreshToken

# Application
APP_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
PORT=3000
NODE_ENV=development

# Optional
DISABLE_RATE_LIMIT=true
```

## Database Migrations

This codebase uses a clean schema approach. To make changes:

1. Edit `db/schema.sql`
2. Run `npm run db:reset` to drop and recreate
3. Run `npm run db:schema` to apply changes
4. Run `npm run db:seed` to populate data

**Note:** In production, use proper migration tools like `node-pg-migrate` or `knex`.

## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Permission Denied

```bash
# Grant permissions to user
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crabiner TO your_user;"
```

### Schema Already Exists

```bash
# Drop all tables and reapply
psql $DATABASE_URL << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

# Then reapply schema
psql $DATABASE_URL < db/schema.sql
```

## NPM Scripts Reference

Add these to your `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "env-cmd -f .env.local node src/server.js",
    "dev:test": "DISABLE_RATE_LIMIT=true env-cmd -f .env.local node src/server.js",
    "db:reset": "psql -U postgres -c 'DROP DATABASE IF EXISTS crabiner;' && psql -U postgres -c 'CREATE DATABASE crabiner;'",
    "db:schema": "psql $DATABASE_URL < db/schema.sql",
    "db:seed": "node db/seed.js",
    "test": "DISABLE_RATE_LIMIT=true node --test tests/**/*.test.js",
    "test:notifications": "DISABLE_RATE_LIMIT=true node --test tests/notifications.test.js"
  }
}
```
