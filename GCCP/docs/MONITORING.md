# GCCP Monitoring Setup Guide

## Overview

This guide covers the complete monitoring and observability setup for the GCCP production environment. Proper monitoring ensures you can detect issues early, understand system performance, and maintain high availability.

**Version:** 1.0.0  
**Last Updated:** 2026-01-30

---

## Table of Contents

1. [Metrics to Track](#metrics-to-track)
2. [Alerting Thresholds](#alerting-thresholds)
3. [Dashboard Setup](#dashboard-setup)
4. [Logging Configuration](#logging-configuration)
5. [Health Checks](#health-checks)
6. [Incident Response](#incident-response)

---

## Metrics to Track

### Application Performance Metrics

| Metric | Type | Description | Collection Method |
|--------|------|-------------|-------------------|
| **API Response Time** | Histogram | Request latency by endpoint | Application logs |
| **Error Rate** | Counter | 5xx errors per minute | Application logs |
| **Request Rate** | Counter | Requests per second | Load balancer |
| **Active Users** | Gauge | Concurrent active sessions | Application |
| **Generation Duration** | Histogram | Time to complete generation | Database |
| **PDF Export Time** | Histogram | PDF generation latency | Application logs |

### AI/ML Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| **Anthropic API Latency** | Histogram | Time to receive AI response | > 10s p95 |
| **Token Usage** | Counter | Tokens consumed per request | Monitor trends |
| **API Error Rate** | Counter | Anthropic API failures | > 5% |
| **Cost per Generation** | Gauge | Estimated cost per generation | > $0.50 |
| **Quality Score** | Gauge | Critic agent scores | < 6.5 average |

### Database Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| **Connection Pool Usage** | Gauge | Active connections / max | > 80% |
| **Query Duration** | Histogram | SQL query execution time | > 500ms p95 |
| **Replication Lag** | Gauge | Replica lag in seconds | > 5s |
| **Table Bloat** | Gauge | Dead tuples ratio | > 20% |
| **Cache Hit Ratio** | Gauge | PostgreSQL buffer cache | < 95% |

### Infrastructure Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| **CPU Usage** | Gauge | Server CPU utilization | > 80% |
| **Memory Usage** | Gauge | RAM utilization | > 85% |
| **Disk Usage** | Gauge | Storage utilization | > 85% |
| **Network I/O** | Counter | Bytes in/out | Monitor trends |

### Business Metrics

| Metric | Type | Description | Collection Method |
|--------|------|-------------|-------------------|
| **Generations Created** | Counter | New generations per hour | Database |
| **Success Rate** | Gauge | Successful / total generations | Database |
| **User Signups** | Counter | New user registrations | Auth logs |
| **Active Projects** | Gauge | Projects with recent activity | Database |
| **Export Downloads** | Counter | PDF exports per day | Application logs |

---

## Alerting Thresholds

### Critical Alerts (Page On-Call)

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| **Service Down** | HTTP 5xx > 10% | 2 minutes | Page on-call |
| **Database Unavailable** | Connection failures | 1 minute | Page on-call |
| **Generation Failures** | Error rate > 20% | 5 minutes | Page on-call |
| **High Error Rate** | 5xx > 5% | 5 minutes | Slack alert |

### Warning Alerts (Slack Notification)

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| **High Latency** | p95 > 2s | 10 minutes | Slack warning |
| **Elevated Errors** | 5xx > 1% | 5 minutes | Slack warning |
| **Slow Generations** | Avg > 60s | 15 minutes | Slack warning |
| **Low Quality Scores** | Avg < 7.0 | 1 hour | Slack warning |
| **High API Costs** | Hourly cost > $50 | 1 hour | Slack warning |

### Info Alerts (Dashboard Only)

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Traffic Spike** | Requests > 2x baseline | Capacity planning |
| **New User Milestone** | Signups round number | Growth tracking |
| **Deployment Complete** | Version change | Change tracking |

### Alert Configuration Examples

#### PagerDuty Integration

```yaml
# pagerduty-service.yml
service:
  name: "GCCP Production"
  escalation_policy: "Engineering On-Call"
  alert_grouping: true
  
integrations:
  - type: events_api_v2
    name: "Datadog Alerts"
  - type: events_api_v2
    name: "Sentry Errors"
```

#### Slack Webhook Configuration

```bash
# Set in environment
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#gccp-alerts
```

---

## Dashboard Setup

### Grafana Dashboard

#### Dashboard 1: System Overview

```json
{
  "dashboard": {
    "title": "GCCP - System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ],
        "thresholds": ["0.01", "0.05"]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_gauge"
          }
        ]
      }
    ]
  }
}
```

#### Dashboard 2: Generation Performance

```json
{
  "dashboard": {
    "title": "GCCP - Generation Metrics",
    "panels": [
      {
        "title": "Generation Duration by Mode",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(generation_duration_seconds) by (mode)"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(generations_completed_total[1h])) / sum(rate(generations_started_total[1h]))"
          }
        ],
        "fieldConfig": {
          "max": 1,
          "min": 0,
          "thresholds": [
            {"color": "red", "value": 0},
            {"color": "yellow", "value": 0.95},
            {"color": "green", "value": 0.99}
          ]
        }
      },
      {
        "title": "Quality Score Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "feedback_score_bucket"
          }
        ]
      },
      {
        "title": "Token Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(tokens_used_total[1h])"
          }
        ]
      }
    ]
  }
}
```

#### Dashboard 3: Database Health

```sql
-- PostgreSQL Monitoring Queries for Grafana

-- Connection Pool Usage
SELECT 
    count(*) as active_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
FROM pg_stat_activity;

-- Slow Queries
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table Sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Supabase Dashboard Integration

Enable these in Supabase Dashboard:

1. **Database → Reports**
   - Connection pool usage
   - Query performance
   - Storage usage

2. **Auth → Audit Logs**
   - Failed login attempts
   - New user registrations
   - Suspicious activity

3. **Edge Functions → Logs**
   - Function invocations
   - Error rates
   - Cold start times

---

## Logging Configuration

### Log Levels

| Level | Usage | Retention |
|-------|-------|-----------|
| **ERROR** | Failures requiring immediate attention | 90 days |
| **WARN** | Anomalies, degraded performance | 30 days |
| **INFO** | Significant business events | 14 days |
| **DEBUG** | Detailed troubleshooting | 7 days |

### Structured Logging Format

```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service: string;          // 'api' | 'edge-function' | 'client'
  traceId: string;          // Distributed tracing ID
  userId?: string;          // Authenticated user ID
  generationId?: string;    // Related generation
  message: string;
  metadata: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    agent?: string;
    stage?: string;
    [key: string]: unknown;
  };
}
```

### Log Aggregation Setup

#### Option 1: Datadog

```typescript
// lib/logger.ts
import { datadogLogs } from '@datadog/browser-logs';

datadogLogs.init({
  clientToken: process.env.DD_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'gccp',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
});

export const logger = {
  error: (message: string, metadata?: object) => {
    datadogLogs.logger.error(message, metadata);
  },
  warn: (message: string, metadata?: object) => {
    datadogLogs.logger.warn(message, metadata);
  },
  info: (message: string, metadata?: object) => {
    datadogLogs.logger.info(message, metadata);
  },
};
```

#### Option 2: Custom Winston Setup

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'gccp-api',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### Edge Function Logging

```typescript
// supabase/functions/generate-content/index.ts

const log = async (
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  metadata?: Record<string, unknown>
) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: 'edge-function',
    function: 'generate-content',
    message,
    metadata: {
      ...metadata,
      requestId: crypto.randomUUID(),
    },
  };
  
  // Log to Supabase
  await supabase.from('system_logs').insert(entry);
  
  // Also log to console for edge function logs
  console.log(JSON.stringify(entry));
};
```

---

## Health Checks

### Endpoint Health Checks

#### 1. Basic Health Check

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    database: false,
    anthropic: false,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Check database
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('profiles').select('count').single();
    checks.database = true;
    
    // Check Anthropic (lightweight check)
    const anthropicCheck = await fetch('https://api.anthropic.com/v1/health', {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY || '' },
    });
    checks.anthropic = anthropicCheck.ok;
    
    const healthy = checks.database && checks.anthropic;
    
    return NextResponse.json(
      { status: healthy ? 'healthy' : 'degraded', checks },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', checks, error: String(error) },
      { status: 503 }
    );
  }
}
```

#### 2. Detailed Health Check

```typescript
// app/api/health/detailed/route.ts
export async function GET() {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  };
  
  // Database metrics
  const dbMetrics = await getDatabaseMetrics();
  
  // Recent error counts
  const errorCounts = await getRecentErrorCounts();
  
  return NextResponse.json({
    status: 'healthy',
    metrics,
    database: dbMetrics,
    errors: errorCounts,
  });
}
```

### Uptime Monitoring

Configure external uptime monitoring:

#### UptimeRobot Configuration

```yaml
monitors:
  - name: "GCCP Homepage"
    url: "https://your-domain.com"
    interval: 300  # 5 minutes
    alert_contacts:
      - type: email
        value: oncall@your-domain.com
      - type: slack
        value: "#gccp-alerts"
  
  - name: "GCCP API Health"
    url: "https://your-domain.com/api/health"
    interval: 60  # 1 minute
    expected_status: 200
```

#### Pingdom Configuration

```bash
# Create check via API
curl -X POST https://api.pingdom.com/api/3.1/checks \
  -H "Authorization: Bearer $PINGDOM_TOKEN" \
  -d '{
    "name": "GCCP Production",
    "host": "your-domain.com",
    "type": "http",
    "url": "/api/health",
    "resolution": 1,
    "sendnotificationwhendown": 2
  }'
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0** | Complete outage | 15 minutes | Service down, data loss |
| **P1** | Major functionality impaired | 1 hour | Generation failures, auth broken |
| **P2** | Minor functionality impaired | 4 hours | PDF export slow, UI glitches |
| **P3** | Cosmetic issues | 1 day | Typos, minor styling issues |

### Incident Response Runbook

#### P0 - Service Down

1. **Acknowledge** (0-5 min)
   - Page on-call engineer
   - Create incident channel in Slack

2. **Assess** (5-15 min)
   - Check status page of dependencies (Supabase, Anthropic, Vercel)
   - Review recent deployments
   - Check error logs

3. **Mitigate** (15-30 min)
   - Enable maintenance mode if needed
   - Execute rollback if deployment-related
   - Scale up resources if capacity issue

4. **Communicate**
   - Post to status page
   - Notify stakeholders
   - Update incident channel

5. **Resolve**
   - Verify fix in production
   - Monitor for 30 minutes
   - Post-incident review within 24 hours

#### P1 - Generation Failures

1. Check Anthropic API status
2. Review Edge Function logs
3. Check database connection pool
4. If widespread, consider temporary rate limiting
5. Escalate to P0 if not resolved in 1 hour

### Post-Incident Review Template

```markdown
# Post-Incident Review: [INCIDENT_ID]

## Summary
- **Date:** YYYY-MM-DD
- **Duration:** HH:MM
- **Severity:** P0/P1/P2/P3
- **Impact:** [Description of user impact]

## Timeline
- HH:MM - Issue detected
- HH:MM - Response started
- HH:MM - Mitigation applied
- HH:MM - Service restored

## Root Cause
[Detailed technical explanation]

## Resolution
[Steps taken to resolve]

## Lessons Learned
- What went well?
- What could be improved?

## Action Items
- [ ] [Action item] - Owner - Due date
```

---

## Monitoring Checklist

### Initial Setup

- [ ] Configure application metrics collection
- [ ] Set up database monitoring
- [ ] Configure log aggregation
- [ ] Set up error tracking (Sentry)
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
- [ ] Set up on-call rotation
- [ ] Document runbooks

### Daily Checks

- [ ] Review error logs from past 24 hours
- [ ] Check generation success rate
- [ ] Monitor API response times
- [ ] Review cost metrics

### Weekly Reviews

- [ ] Analyze performance trends
- [ ] Review alert effectiveness
- [ ] Update dashboards as needed
- [ ] Capacity planning review

---

## Tools & Services

### Recommended Stack

| Purpose | Tool | Alternative |
|---------|------|-------------|
| **Metrics** | Datadog | Grafana Cloud, New Relic |
| **Logging** | Datadog Logs | Splunk, ELK Stack |
| **Error Tracking** | Sentry | Rollbar, Bugsnag |
| **Uptime** | Pingdom | UptimeRobot, StatusCake |
| **Status Page** | Statuspage | Instatus, Cachet |
| **Alerting** | PagerDuty | Opsgenie, VictorOps |

### Cost Estimates

| Service | Monthly Cost (Production) |
|---------|---------------------------|
| Datadog | $50-200 (depending on volume) |
| Sentry | $26-80 |
| Pingdom | $15-50 |
| PagerDuty | $19-39 per user |
| **Total** | **$110-370/month** |

---

## Additional Resources

- [Supabase Monitoring Guide](https://supabase.com/docs/guides/platform/metrics)
- [Next.js Analytics](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
- [Vercel Monitoring](https://vercel.com/docs/concepts/observability)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
