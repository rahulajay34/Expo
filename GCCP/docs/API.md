# GCCP API Documentation

## Overview

The GCCP API provides endpoints for content generation, export, and management. All API endpoints are RESTful and return JSON responses unless otherwise specified.

**Base URL:** `https://your-domain.com/api`  
**Version:** 2.0.0  
**Authentication:** Bearer Token (Supabase JWT)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Content Generation](#content-generation)
3. [PDF Export](#pdf-export)
4. [Retry Operations](#retry-operations)
5. [Streaming](#streaming)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints (except health checks) require authentication via a Bearer token in the Authorization header.

```http
Authorization: Bearer <supabase_jwt_token>
```

### Obtaining a Token

Tokens are obtained through Supabase Auth:

```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Token Expiration

- Access tokens expire after 1 hour
- Use refresh tokens to obtain new access tokens
- See [Supabase Auth documentation](https://supabase.com/docs/guides/auth) for details

---

## Content Generation

### POST /api/generate

Initiates a new content generation process.

#### Request

```http
POST /api/generate
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  topic: string;           // Main topic for content generation (required)
  subtopics: string;       // Comma-separated list of subtopics (required)
  mode: ContentMode;       // "pre-read" | "lecture" | "assignment" (required)
  transcript?: string;     // Optional source transcript
  assignmentCounts?: {     // Required only for assignment mode
    mcsc: number;          // Multiple choice single correct count
    mcmc: number;          // Multiple choice multiple correct count
    subjective: number;    // Subjective question count
  };
}
```

#### Example Request

```json
{
  "topic": "Introduction to Machine Learning",
  "subtopics": "supervised learning, unsupervised learning, neural networks",
  "mode": "lecture",
  "transcript": "Machine learning is a subset of artificial intelligence..."
}
```

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "generation_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_FIELDS` | Required fields missing |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 500 | `GENERATION_FAILED` | Failed to create generation record |

#### Response Schema

```typescript
interface GenerateResponse {
  success: boolean;
  generation_id: string;  // UUID of created generation
  status: GenerationStatus; // "queued" | "processing" | "completed" | "failed"
}
```

---

## PDF Export

### POST /api/export/pdf

Generates a PDF document from markdown content.

#### Request

```http
POST /api/export/pdf
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  content: string;         // Markdown content to convert (required)
  title?: string;          // Document title (default: "Document")
  author?: string;         // Document author
  filename?: string;       // Output filename (default: "document.pdf")
  styling?: {
    headerColor?: string;  // Hex color for headers
    fontSize?: number;     // Base font size in pt
    lineHeight?: number;   // Line height multiplier
  };
}
```

#### Example Request

```json
{
  "content": "# Machine Learning Basics\n\nMachine learning is...",
  "title": "ML Introduction",
  "author": "GCCP Platform",
  "filename": "ml-intro.pdf",
  "styling": {
    "headerColor": "#1a365d",
    "fontSize": 11,
    "lineHeight": 1.7
  }
}
```

#### Response

**Success (200 OK):**

Returns a PDF file as binary data with headers:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="ml-intro.pdf"
Content-Length: 12345
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_CONTENT` | Content field is empty |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 500 | `PDF_GENERATION_FAILED` | Puppeteer or processing error |

### GET /api/export/pdf

Health check endpoint for PDF service.

#### Response

```json
{
  "status": "ok",
  "service": "PDF Generation API",
  "version": "1.0.0"
}
```

---

## Retry Operations

### POST /api/retry

Retries a failed generation from its last checkpoint.

#### Request

```http
POST /api/retry
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  generation_id: string;   // UUID of failed generation (required)
}
```

#### Example Request

```json
{
  "generation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "generation_id": "550e8400-e29b-41d4-a716-446655440000",
  "resumed_from": "DraftCreation"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_GENERATION_ID` | generation_id not provided |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | User doesn't own this generation |
| 404 | `NOT_FOUND` | Generation not found |
| 500 | `RETRY_FAILED` | Failed to reset generation status |

---

## Streaming

### POST /api/stream

Proxies streaming requests to Anthropic API with server-side API key security.

#### Request

```http
POST /api/stream
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  system?: string;         // System prompt
  messages: Array<{       // Conversation messages (required)
    role: "user" | "assistant";
    content: string;
  }>;
  model: string;          // Anthropic model name (required)
  maxTokens?: number;     // Max tokens to generate (default: 10000)
  temperature?: number;   // Sampling temperature (default: 0.7)
}
```

#### Example Request

```json
{
  "system": "You are an expert educator.",
  "messages": [
    { "role": "user", "content": "Explain neural networks" }
  ],
  "model": "claude-sonnet-4-5-20250929",
  "maxTokens": 4000,
  "temperature": 0.7
}
```

#### Response

**Success:**

Returns a Server-Sent Events (SSE) stream:

```
data: {"type":"chunk","content":"Neural networks are..."}

data: {"type":"chunk","content":"computational models..."}

data: [DONE]
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_FIELDS` | messages or model missing |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 500 | `ANTHROPIC_ERROR` | Anthropic API error |

### PUT /api/stream

Non-streaming version for simpler use cases.

#### Request

Same as POST /api/stream

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Neural networks are computational models..."
    }
  ],
  "usage": {
    "input_tokens": 15,
    "output_tokens": 150
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional context (optional)"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, POST |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Temporary service outage |

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `MISSING_FIELDS` | Required fields not provided | Check request body against schema |
| `MISSING_CONTENT` | Content field empty for PDF | Provide non-empty content |
| `MISSING_GENERATION_ID` | generation_id not provided | Include generation_id in request |
| `UNAUTHORIZED` | Authentication failed | Check token validity and expiration |
| `FORBIDDEN` | Access denied | Verify resource ownership |
| `NOT_FOUND` | Resource not found | Verify ID is correct |
| `GENERATION_FAILED` | Generation creation failed | Check server logs |
| `PDF_GENERATION_FAILED` | PDF creation error | Check Puppeteer/logs |
| `RETRY_FAILED` | Retry operation failed | Check generation status |
| `ANTHROPIC_ERROR` | AI service error | Check Anthropic status |
| `RATE_LIMITED` | Too many requests | Implement exponential backoff |

---

## Rate Limiting

### Limits

| Endpoint | Requests/Minute | Burst |
|----------|-----------------|-------|
| `/api/generate` | 10 | 5 |
| `/api/export/pdf` | 30 | 10 |
| `/api/retry` | 10 | 5 |
| `/api/stream` | 60 | 20 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retry_after": 60
}
```

### Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Cache responses** when appropriate
3. **Batch operations** instead of making many individual requests
4. **Monitor rate limit headers** to proactively throttle requests

Example backoff implementation:

```typescript
async function fetchWithBackoff(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Webhooks

### Generation Completion Webhook

Configure a webhook URL to receive notifications when generations complete.

#### Webhook Payload

```json
{
  "event": "generation.completed",
  "timestamp": "2026-01-30T21:30:00Z",
  "data": {
    "generation_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "mode": "lecture",
    "topic": "Introduction to Machine Learning",
    "duration_seconds": 45
  }
}
```

#### Webhook Verification

Webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=<hmac_signature>
```

Verify using your webhook secret:

```typescript
import { createHmac } from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === `sha256=${expected}`;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generate content
async function generateContent(topic: string, subtopics: string, mode: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ topic, subtopics, mode })
  });
  
  return response.json();
}

// Export PDF
async function exportPDF(content: string, title: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ content, title })
  });
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.pdf`;
  a.click();
}

// Retry failed generation
async function retryGeneration(generationId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('/api/retry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ generation_id: generationId })
  });
  
  return response.json();
}
```

### cURL Examples

```bash
# Set your token
TOKEN="your-jwt-token"

# Generate content
curl -X POST https://your-domain.com/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "topic": "Machine Learning",
    "subtopics": "supervised, unsupervised",
    "mode": "lecture"
  }'

# Export PDF
curl -X POST https://your-domain.com/api/export/pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "# ML Basics\n\nMachine learning is...",
    "title": "ML Intro"
  }' \
  --output document.pdf

# Retry generation
curl -X POST https://your-domain.com/api/retry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Changelog

### v2.0.0 (2026-01-30)

- Added real-time progress tracking
- Added retry endpoint for failed generations
- Added streaming proxy endpoint
- Enhanced PDF export with custom styling
- Added rate limiting headers

### v1.0.0 (2026-01-15)

- Initial API release
- Basic generation and export endpoints
- Supabase authentication integration
