# GCCP Production Deployment Guide

## Overview

This guide covers the complete deployment process for the GCCP (Generative Course Content Platform) production environment. Follow these steps carefully to ensure a smooth deployment.

**Version:** 2.0.0  
**Last Updated:** 2026-01-30  
**Environment:** Production

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration Steps](#database-migration-steps)
3. [Environment Variable Updates](#environment-variable-updates)
4. [Deployment Sequence](#deployment-sequence)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Supabase project provisioned and accessible
- [ ] Vercel/Next.js hosting configured
- [ ] Anthropic API key with sufficient quota
- [ ] Domain DNS configured (if applicable)
- [ ] SSL certificates installed
- [ ] Monitoring tools configured (Sentry, LogRocket, etc.)

### Code Preparation

- [ ] All tests passing (`npm run test:all`)
- [ ] Lint checks passing (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors in development
- [ ] Environment variables documented
- [ ] Database migrations tested on staging

### Security Checklist

- [ ] API keys rotated from development values
- [ ] Row Level Security (RLS) policies enabled
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured
- [ ] Sensitive data excluded from logs
- [ ] `.env` files added to `.gitignore`

### Data Preparation

- [ ] Database backup created
- [ ] Migration scripts reviewed
- [ ] Seed data prepared (if needed)
- [ ] Stage weights configured
- [ ] Default user preferences defined

---

## Database Migration Steps

### Step 1: Create Database Backup

```bash
# Using Supabase CLI
supabase db dump --db-url $PRODUCTION_DB_URL -f backups/pre-deployment-$(date +%Y%m%d).sql

# Or using pg_dump directly
pg_dump $DATABASE_URL > backups/pre-deployment-$(date +%Y%m%d).sql
```

### Step 2: Run Initial Schema Migration

Apply the base schema first:

```bash
# Via Supabase Dashboard SQL Editor
# Or using psql
psql $DATABASE_URL -f supabase/migrations/20260127000000_initial_schema.sql
```

**Migration Contents:**
- Creates `profiles`, `generations`, `generation_logs`, `checkpoints` tables
- Sets up enums: `user_role`, `generation_status`, `content_mode`, `log_type`
- Creates indexes for performance
- Enables Row Level Security (RLS)
- Sets up realtime subscriptions

### Step 3: Run Production Enhancements Migration

Apply the production v2.0 enhancements:

```bash
psql $DATABASE_URL -f supabase/migrations/20260130000000_production_enhancements.sql
```

**Migration Contents:**

#### New Columns on `generations` table:
| Column | Type | Description |
|--------|------|-------------|
| `progress_percent` | INTEGER | Real-time progress (0-100) |
| `progress_message` | TEXT | Current status message |
| `partial_content` | TEXT | Streaming content buffer |
| `current_agent` | TEXT | Currently active agent |
| `started_at` | TIMESTAMPTZ | Generation start time |
| `completed_at` | TIMESTAMPTZ | Generation completion time |
| `resume_token` | TEXT | Token for resuming interrupted generations |
| `last_checkpoint_step` | INTEGER | Last saved checkpoint |

#### New Tables:

**`generation_metrics`** - Stage-level performance tracking
```sql
CREATE TABLE generation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    stage_weight DECIMAL(5, 2) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    token_count INTEGER,
    cost_estimate DECIMAL(10, 6),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**`historical_timing`** - Performance baselines
```sql
CREATE TABLE historical_timing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_name TEXT NOT NULL,
    mode content_mode NOT NULL,
    avg_duration_ms INTEGER NOT NULL,
    min_duration_ms INTEGER,
    max_duration_ms INTEGER,
    sample_count INTEGER DEFAULT 1 NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(stage_name, mode)
);
```

**`feedback_scores`** - Critic agent evaluations
```sql
CREATE TABLE feedback_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    iteration INTEGER NOT NULL,
    overall_score DECIMAL(3, 2) NOT NULL,
    completeness_score DECIMAL(3, 2),
    accuracy_score DECIMAL(3, 2),
    pedagogy_score DECIMAL(3, 2),
    formatting_score DECIMAL(3, 2),
    feedback_text TEXT,
    suggestions JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**`user_preferences`** - User settings
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_mode content_mode DEFAULT 'lecture',
    auto_save BOOLEAN DEFAULT true,
    show_preview BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system',
    default_course_context JSONB,
    custom_templates JSONB,
    generation_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);
```

**`stage_weights`** - Progress calculation weights
```sql
CREATE TABLE stage_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_name TEXT NOT NULL UNIQUE,
    stage_order INTEGER NOT NULL,
    weight_percent INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Default Stage Weights:
| Stage | Order | Weight | Description |
|-------|-------|--------|-------------|
| Initialization | 1 | 2% | Setup and validation |
| CourseDetection | 2 | 5% | Detect course context |
| GapAnalysis | 3 | 5% | Analyze transcript gaps |
| DraftCreation | 4 | 40% | Create content draft |
| Review | 5 | 15% | Review and validate |
| Refinement | 6 | 20% | Refine content |
| Formatting | 7 | 10% | Format final output |
| Completion | 8 | 3% | Finalization |

### Step 4: Verify Migration

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'generations', 'generation_logs', 'checkpoints', 
                   'generation_metrics', 'historical_timing', 'feedback_scores', 
                   'user_preferences', 'stage_weights');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('generations', 'generation_metrics', 'feedback_scores');

-- Verify stage weights populated
SELECT stage_name, weight_percent FROM stage_weights ORDER BY stage_order;
```

---

## Environment Variable Updates

### Required Environment Variables

Create a `.env.production` file with these variables:

```bash
# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# ============================================
# Anthropic AI Configuration
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...

# ============================================
# Application Configuration
# ============================================
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# ============================================
# Optional: Monitoring & Analytics
# ============================================
# SENTRY_DSN=https://...@sentry.io/...
# LOGROCKET_APP_ID=your-app-id
# POSTHOG_KEY=phc_...

# ============================================
# Optional: Rate Limiting
# ============================================
# RATE_LIMIT_REQUESTS=100
# RATE_LIMIT_WINDOW_MS=60000
```

### Variable Descriptions

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client-side Supabase key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase key | `eyJhbG...` |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API access | `sk-ant-api03-...` |
| `NEXT_PUBLIC_APP_URL` | Yes | Production domain | `https://gccp.app` |
| `NODE_ENV` | Yes | Environment mode | `production` |

### Security Notes

- Never commit `.env.production` to version control
- Rotate API keys before production deployment
- Use different keys for staging and production
- Enable IP restrictions on Supabase if possible
- Set up API key usage alerts in Anthropic dashboard

---

## Deployment Sequence

### Phase 1: Database Deployment (5 minutes)

```bash
# 1. Connect to production database
export DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# 2. Run migrations
psql $DATABASE_URL -f supabase/migrations/20260127000000_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/20260130000000_production_enhancements.sql

# 3. Verify deployment
psql $DATABASE_URL -c "\dt"
```

### Phase 2: Edge Function Deployment (3 minutes)

```bash
# Deploy the generate-content Edge Function
supabase functions deploy generate-content --project-ref $PROJECT_REF

# Verify deployment
supabase functions list --project-ref $PROJECT_REF
```

**Edge Function Configuration:**
- Function Name: `generate-content`
- Runtime: Deno
- Memory: 1GB (recommended for AI processing)
- Timeout: 300 seconds (5 minutes)

### Phase 3: Frontend Deployment (5 minutes)

```bash
# 1. Install dependencies
npm ci

# 2. Run production build
npm run build

# 3. Deploy to Vercel
vercel --prod

# Or deploy to custom server
npm run start
```

### Phase 4: Post-Deployment Configuration (5 minutes)

1. **Configure CORS in Supabase:**
   ```sql
   -- Allow production domain
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('content', 'content', true)
   ON CONFLICT DO NOTHING;
   ```

2. **Enable Realtime for new tables:**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE generation_metrics;
   ALTER PUBLICATION supabase_realtime ADD TABLE feedback_scores;
   ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
   ```

3. **Set up default admin user (optional):**
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'admin@yourdomain.com';
   ```

---

## Post-Deployment Verification

### Automated Verification

Run the verification script:

```bash
npm run verify:deployment
```

Or manually verify:

### 1. API Health Checks

```bash
# Test PDF export endpoint
curl -X GET https://your-domain.com/api/export/pdf

# Expected: {"status":"ok","service":"PDF Generation API","version":"1.0.0"}

# Test generate endpoint (requires auth)
curl -X POST https://your-domain.com/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"topic":"Test","subtopics":"test","mode":"lecture"}'
```

### 2. Database Connectivity

```sql
-- Test RLS policies
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'test-user-uuid';

-- Should return empty (no unauthorized access)
SELECT * FROM profiles WHERE id != 'test-user-uuid';

-- Reset
RESET ROLE;
```

### 3. Edge Function Testing

```bash
# Invoke function directly
curl -X POST https://[project-ref].supabase.co/functions/v1/generate-content \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"generation_id":"test-uuid"}'
```

### 4. End-to-End Test

1. Navigate to production URL
2. Sign up/in with test account
3. Create a test generation:
   - Topic: "Introduction to Testing"
   - Subtopics: "unit tests, integration tests"
   - Mode: "lecture"
4. Verify progress tracking updates
5. Verify completion and content display
6. Test PDF export

### 5. Performance Baseline

Record initial metrics:

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/export/pdf

# Expected: < 200ms for health checks
```

### Verification Checklist

- [ ] Homepage loads without errors
- [ ] Authentication works (sign up/in/out)
- [ ] Generation creation succeeds
- [ ] Real-time progress updates work
- [ ] PDF export generates valid file
- [ ] Database writes are working
- [ ] RLS policies are enforced
- [ ] No console errors in browser
- [ ] Mobile responsive design works

---

## Rollback Procedures

### Quick Rollback (Database)

If issues are detected within 30 minutes:

```bash
# 1. Stop new traffic (enable maintenance mode in Vercel)
vercel --prod --meta MAINTENANCE_MODE=true

# 2. Restore from backup
psql $DATABASE_URL < backups/pre-deployment-YYYYMMDD.sql

# 3. Redeploy previous version
git checkout [previous-commit]
vercel --prod
```

### Full Rollback Procedure

#### Step 1: Assess Impact

```bash
# Check error rates
curl -s https://your-domain.com/api/health/metrics

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Step 2: Enable Maintenance Mode

```bash
# Set environment variable
vercel env add MAINTENANCE_MODE production
# Value: true

# Redeploy to apply
vercel --prod
```

#### Step 3: Database Rollback

```bash
# Option A: Restore from backup (data loss since backup)
pg_restore -d $DATABASE_URL backups/pre-deployment-YYYYMMDD.sql

# Option B: Reverse migrations (if no data loss)
psql $DATABASE_URL -f scripts/rollback-migrations.sql
```

#### Step 4: Code Rollback

```bash
# Rollback to previous release
git log --oneline -10  # Find previous commit
git checkout [previous-stable-commit]

# Reinstall dependencies
npm ci

# Rebuild and deploy
npm run build
vercel --prod
```

#### Step 5: Verify Rollback

Run the same verification steps as post-deployment.

#### Step 6: Communication

- Notify team via Slack/Discord
- Update status page
- Document incident for post-mortem

### Rollback Scripts

Use the provided rollback script:

```bash
# Make executable
chmod +x scripts/rollback.sh

# Run rollback
./scripts/rollback.sh --backup-file backups/pre-deployment-YYYYMMDD.sql
```

See [`scripts/rollback.sh`](../scripts/rollback.sh) for full details.

---

## Troubleshooting

### Common Issues

#### Database Connection Failures

**Symptoms:** API returns 500 errors, "connection refused"

**Solutions:**
1. Check `DATABASE_URL` is correct
2. Verify IP allowlist in Supabase
3. Check connection pool limits
4. Restart application server

#### Edge Function Timeouts

**Symptoms:** Generations hang at certain progress percentages

**Solutions:**
1. Check Edge Function logs in Supabase dashboard
2. Increase function timeout (max 300s)
3. Check Anthropic API status
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

#### Real-time Updates Not Working

**Symptoms:** Progress bar doesn't update during generation

**Solutions:**
1. Verify realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE generations;`
2. Check browser console for WebSocket errors
3. Verify RLS policies allow SELECT on generations
4. Check network tab for subscription requests

#### PDF Export Failures

**Symptoms:** PDF generation returns 500 or empty file

**Solutions:**
1. Check Puppeteer/chrome dependencies installed
2. Verify server has sufficient memory (>2GB)
3. Check `/tmp` directory permissions
4. Review server logs for Puppeteer errors

---

## Support Contacts

- **Technical Lead:** [Your Name] <email@domain.com>
- **DevOps:** [DevOps Contact] <devops@domain.com>
- **Supabase Support:** https://supabase.com/support
- **Anthropic Support:** https://support.anthropic.com

---

## Appendix

### Migration Rollback SQL

```sql
-- Reverse production enhancements (use with caution)
DROP TABLE IF EXISTS generation_metrics CASCADE;
DROP TABLE IF EXISTS historical_timing CASCADE;
DROP TABLE IF EXISTS feedback_scores CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS stage_weights CASCADE;

ALTER TABLE generations 
DROP COLUMN IF EXISTS progress_percent,
DROP COLUMN IF EXISTS progress_message,
DROP COLUMN IF EXISTS partial_content,
DROP COLUMN IF EXISTS current_agent,
DROP COLUMN IF EXISTS started_at,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS resume_token,
DROP COLUMN IF EXISTS last_checkpoint_step;
```

### Performance Monitoring Queries

```sql
-- Average generation duration by mode
SELECT 
    mode,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM generations
WHERE status = 'completed'
AND completed_at > NOW() - INTERVAL '24 hours'
GROUP BY mode;

-- Error rate in last hour
SELECT 
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) as total_count,
    (COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*)) as error_rate
FROM generations
WHERE created_at > NOW() - INTERVAL '1 hour';
```
