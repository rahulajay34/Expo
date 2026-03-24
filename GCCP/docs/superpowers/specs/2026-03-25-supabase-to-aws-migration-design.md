# Supabase → AWS Migration Design
**Date:** 2026-03-25
**Project:** GCCP (Generated Course Content Platform)
**Status:** Approved by user

---

## 1. Goal

Migrate the GCCP application from Supabase to a full AWS backend with:
- Google Sign-In via AWS Cognito
- Server-side AI generation pipeline via AWS Lambda (streaming)
- Full content persistence per user via DynamoDB
- Real-time UI updates showing exactly what the backend is doing at every step

---

## 2. Current State

### Active Supabase Usage (3 files)
| File | Usage | Action |
|---|---|---|
| `src/lib/agents/orchestrator.ts` | Triggers background meta-analysis | Modify |
| `src/lib/services/meta-feedback.ts` | Aggregates quality scores to Supabase tables | Remove |
| `src/lib/queue/job-queue.ts` | Supabase-backed job queue — dead code (never instantiated) | Remove |
| `src/lib/queue/worker.ts` | Supabase worker — dead code | Remove |

### AI Client Note
The codebase uses an aliased Gemini client: `src/lib/anthropic/client.ts` re-exports from `src/lib/gemini/client.ts` as `AnthropicClient`. The orchestrator imports `AnthropicClient` from `@/lib/anthropic/client` — this resolves to the Gemini client. `useGeneration.ts` currently passes `XAI_API_KEY` as the constructor argument.

**Decision for Lambda:** Use `GEMINI_API_KEY` in Lambda. The Lambda orchestrator will import the Gemini client directly (not via the alias) and use `process.env.GEMINI_API_KEY`. This is the cleaner path — avoid the alias confusion in the Lambda codebase.

### What currently works client-side
- 7-agent orchestrator runs entirely in the browser
- Generated content stored in Zustand + localStorage only
- No user accounts, no cross-device access
- Archives page reads from Zustand/localStorage only

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Next.js)                  │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Auth UI  │  │ Editor/Stream │  │History/Archive│  │
│  └────┬─────┘  └──────┬────────┘  └──────┬───────┘  │
└───────┼───────────────┼──────────────────┼───────────┘
        │               │                  │
        ▼               ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Cognito    │  │  Lambda      │  │    DynamoDB       │
│  User Pool   │  │  Function    │◄─┤  gccp-generations │
│  + Google    │  │  URL         │  │  gccp-gen-logs    │
│  Sign-In     │  │  (Streaming) │  │  gccp-meta-fbk    │
└──────────────┘  └──────────────┘  └──────────────────┘
        │               │
        └───────────────┘
         JWT verification
         inside Lambda
```

### AWS Services & Free Tier Budget
| Service | Free Tier | Expected Usage |
|---|---|---|
| Cognito User Pool | 50,000 MAU | <10 users ✓ |
| Lambda | 1M req/mo, 400K GB-sec/mo | <1,000 req/mo ✓ |
| DynamoDB | 25GB storage, 25 RCU/WCU | <1GB ✓ |
| S3 | 5GB (12 months) | Overflow for large content |
| CloudWatch Logs | 5GB/mo | Fine ✓ |

---

## 4. Authentication Design

### Flow
```
User clicks "Sign in with Google"
        ↓
Cognito Hosted UI → Google OAuth consent screen
        ↓
Google authenticates → callback to Cognito
        ↓
Cognito issues: ID Token + Access Token + Refresh Token
        ↓
Tokens stored in localStorage via amazon-cognito-identity-js
        ↓
Every Lambda call: Authorization: Bearer <ID Token>
        ↓
Lambda verifies token via Cognito JWKS (no Cognito round-trip, pure JWT)
        ↓
On expiry (1hr): amazon-cognito-identity-js auto-refreshes silently
```

### Token Storage Decision
**Using `amazon-cognito-identity-js` with localStorage** (Option A — simpler).
httpOnly cookies are not used — they require a server-side callback route and cannot be set by JavaScript. For a small internal team this is an acceptable trade-off. Tokens are cleared on logout.

### AWS Console Setup Required
1. **Cognito User Pool** — create with Google social IDP enabled
2. **App Client** — configure callback URLs (`http://localhost:3000/auth/callback`, production URL), no client secret (public client)
3. **Google OAuth credentials** — from Google Cloud Console (OAuth 2.0 client ID + secret, redirect URI points to Cognito domain)
4. **Federated identity** — link Google as social provider in Cognito User Pool

### Frontend Auth Library
`amazon-cognito-identity-js` — lightweight, no full Amplify needed.

### New Auth Files
```
src/
├── lib/auth/
│   ├── cognito.ts          ← Cognito config, getUserPool(), getToken(), refreshSession()
│   └── AuthContext.tsx     ← React context: user, signIn, signOut, loading, idToken
├── components/auth/
│   └── GoogleSignInButton.tsx
└── middleware.ts           ← Protect routes, redirect unauthenticated users to /login
```

### Middleware + localStorage Note
Next.js middleware runs on the edge (server-side) and cannot access `localStorage`. Since tokens are stored in localStorage by `amazon-cognito-identity-js`, the middleware cannot verify the actual JWT. **Strategy:** on successful login, also set a lightweight non-httpOnly cookie (e.g., `gccp-auth=1`) as a presence signal. Middleware checks for this cookie to decide whether to redirect. The cookie does not contain the token — it is only a UI routing hint. True auth enforcement happens inside Lambda (JWT verification). This means if someone manually sets the cookie they can see the UI pages, but all data calls to Lambda will fail 401. This is acceptable for a small internal team.

### User Identity
Cognito assigns each user a unique `sub` (UUID) used as `userId` in all DynamoDB records, isolating all data per user.

---

## 5. Lambda Streaming Design

### Critical Requirement: Real-Time UI Updates
**Every event from the backend must immediately appear in the UI.** The Lambda streams NDJSON (newline-delimited JSON) events for every agent action — start, token chunks, completion, errors. The frontend reads this stream and dispatches events to the Zustand store using the same event shape the current client-side orchestrator emits. The user always sees exactly what the backend is doing.

### Streaming Format: NDJSON
The Lambda writes **newline-delimited JSON** (one JSON object per line, each terminated with `\n`). This is simpler to write in Lambda and easier to parse in the browser than true SSE.

**Lambda writes:**
```
{"type":"job_created","generationId":"GEN#..."}\n
{"type":"step","agent":"Creator","status":"working","action":"drafting","message":"Drafting lecture content..."}\n
{"type":"chunk","content":"# Introduction\n"}\n
{"type":"step","agent":"Creator","status":"done","action":"complete","tokensUsed":1240,"cost":0.0012}\n
{"type":"step","agent":"Analyzer","status":"working","action":"analyzing","message":"Analyzing content gaps..."}\n
... (same event types the current orchestrator emits — see below)
{"type":"complete","generationId":"GEN#...","totalCost":0.0089}\n

// On error:
{"type":"error","agent":"Refiner","message":"Rate limit hit, retrying..."}\n
{"type":"fatal","message":"Generation failed","error":"..."}\n
```

### Event Types (Match Current Orchestrator Exactly)
The Lambda emits the **same event types** the current `orchestrator.ts` sends to the browser, so `useGeneration.ts` event parsing is unchanged:

| Event type | When emitted |
|---|---|
| `step` | Agent starts, progresses, or completes a stage |
| `chunk` | Streaming token from LLM |
| `replace` | Full content replacement from an agent |
| `formatted` | Final formatted content ready |
| `complete` | Full generation done |
| `gap_analysis` | Gap analysis result available |
| `course_detected` | Course context detected |
| `instructor_quality` | Instructor quality result available |
| `mismatch_stop` | Content mismatch, generation stopped |
| `error` | Non-fatal error |
| `job_created` | New event — generationId assigned (used to link to DynamoDB) |

### CORS Configuration (Required)
Lambda Function URL must have CORS configured. The browser origin (Vercel/localhost) differs from the Lambda URL domain. Required headers:

```json
{
  "AllowOrigins": ["http://localhost:3000", "https://<your-vercel-domain>"],
  "AllowMethods": ["POST", "GET", "OPTIONS"],
  "AllowHeaders": ["Content-Type", "Authorization"],
  "ExposeHeaders": [],
  "MaxAge": 86400
}
```

### Lambda Endpoints (single Function URL, path-based routing)
| Path | Method | Auth | Purpose |
|---|---|---|---|
| `/generate` | POST | Required | Run generation pipeline, stream NDJSON |
| `/history` | GET | Required | List user's past generations |
| `/generation/:id` | GET | Required | Fetch single generation + logs |
| `/meta-feedback` | GET | Required | Get quality feedback for user |
| `/meta-feedback` | POST | Required | Update meta feedback |

### Lambda File Structure
```
lambda/
├── handler.ts                  ← Entry point: JWT verify, CORS, route dispatch
├── routes/
│   ├── generate.ts             ← Stream generation pipeline
│   └── history.ts              ← DynamoDB read endpoints
├── agents/                     ← All agents copied from src/lib/agents/
│   ├── orchestrator.ts         ← Modified: remove Supabase, add streamWriter callback
│   ├── creator.ts
│   ├── analyzer.ts
│   ├── sanitizer.ts
│   ├── refiner.ts
│   ├── reviewer.ts
│   ├── formatter.ts
│   ├── assignment-sanitizer.ts
│   ├── meta-quality.ts
│   ├── instructor-quality.ts
│   └── course-detector.ts
├── services/
│   ├── dynamo.ts               ← DynamoDB read/write helpers
│   ├── s3.ts                   ← S3 overflow for large content (>300KB)
│   └── auth.ts                 ← Cognito JWT verification via JWKS
├── utils/                      ← Shared utilities from src/lib/utils/ (no cache modules)
└── package.json                ← Lambda-only deps: @aws-sdk/client-dynamodb,
                                   @aws-sdk/client-s3, @google/generative-ai,
                                   jose (JWT), awslambda-response-streaming
```

### Required Code Changes When Porting Orchestrator to Lambda

1. **Remove Supabase import** — delete `triggerMetaAnalysis()` and Supabase client init
2. **Add `performance` import** — `orchestrator.ts` uses `performance.now()` which is not auto-global in Node.js. Add: `import { performance } from 'perf_hooks';`
3. **Import Gemini client directly** — do not use the `AnthropicClient` alias; import `GeminiClient` from the gemini module directly and use `process.env.GEMINI_API_KEY`
4. **Add `streamWriter` parameter** — orchestrator's `generate()` method takes a callback; in Lambda this writes NDJSON lines to the response stream instead of returning events to the browser
5. **In-memory cache behavior** — `cache.ts` and `semantic-cache.ts` use module-level Maps. In Lambda these persist within a warm container but are wiped on cold starts and not shared across concurrent invocations. This is acceptable for <10 users but cache hit rates will be lower than client-side. SemanticCache embeddings in particular will not persist across Lambda calls. This is documented — do not attempt to fix it, just accept per-invocation caching.

### Lambda Configuration
| Setting | Value |
|---|---|
| Runtime | Node.js 20.x |
| Timeout | 15 minutes |
| Memory | 512MB |
| Invoke mode | RESPONSE_STREAM |
| Function URL Auth | NONE (JWT verified inside handler) |
| CORS | Configured as above |

### Frontend Hook Change (`useGeneration.ts`)
```typescript
// BEFORE: calls orchestrator directly in browser
await orchestrator.generate(params, onUpdate);

// AFTER: calls Lambda, reads NDJSON stream, dispatches same Zustand events
const response = await fetch(process.env.NEXT_PUBLIC_LAMBDA_URL + '/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`
  },
  body: JSON.stringify(params)
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line
  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    dispatch(event); // same Zustand dispatch as before
  }
}
// UI is unchanged — same event types, same state updates
```

---

## 6. DynamoDB Schema

### DynamoDB Item Size & S3 Overflow
DynamoDB has a 400KB per-item limit. Generated content (especially lecture notes with multi-round refinement) can potentially exceed this. **Decision:** if `finalContent` exceeds 300KB, store it in S3 (`gccp-content/<userId>/<generationId>.md`) and store only the S3 key in DynamoDB (`finalContentS3Key`). The history/retrieval endpoint checks for this key and fetches from S3 transparently.

### Table 1: `gccp-generations`
- **PK:** `userId` (String) — Cognito sub
- **SK:** `generationId` (String) — `GEN#<ISO-timestamp>#<uuid>`

| Attribute | Type | Notes |
|---|---|---|
| `topic` | String | |
| `mode` | String | `lecture` \| `pre-read` \| `assignment` |
| `subtopics` | List | |
| `transcript` | String | Optional |
| `status` | String | `processing` \| `completed` \| `failed` |
| `finalContent` | String | Full markdown — only if ≤ 300KB |
| `finalContentS3Key` | String | S3 path — only if content > 300KB |
| `assignmentData` | Map | MCQ/MSQ/Subjective JSON |
| `gapAnalysis` | Map | Gap analysis result |
| `estimatedCost` | Number | In USD |
| `createdAt` | String | ISO timestamp |
| `updatedAt` | String | ISO timestamp |

### Table 2: `gccp-generation-logs`
- **PK:** `generationId` (String)
- **SK:** `logId` (String) — `LOG#<ISO-timestamp>#<sequence>`

| Attribute | Type | Notes |
|---|---|---|
| `agentName` | String | |
| `message` | String | |
| `logType` | String | `info` \| `success` \| `error` \| `step` |
| `metadata` | Map | tokens, cost, action, data |
| `createdAt` | String | ISO timestamp |

### Table 3: `gccp-meta-feedback`
- **PK:** `userId` (String)
- **SK:** `mode` (String) — `lecture` \| `pre-read` \| `assignment`

| Attribute | Type | Notes |
|---|---|---|
| `feedbackContent` | Map | Quality scores, issue clusters, strengths |
| `generationCount` | Number | Rolling count |
| `lastUpdated` | String | ISO timestamp |

### Access Patterns
| Operation | Table | Query |
|---|---|---|
| List user's generations | gccp-generations | Query by `userId`, sort by SK desc |
| Get single generation | gccp-generations | Get by `userId` + `generationId` |
| Get generation logs | gccp-generation-logs | Query by `generationId` |
| Get meta feedback | gccp-meta-feedback | Get by `userId` + `mode` |

---

## 7. Frontend Changes Summary

### Files Removed
- `src/lib/queue/job-queue.ts`
- `src/lib/queue/worker.ts`
- `src/lib/services/meta-feedback.ts`
- `src/lib/supabase/` (entire folder if exists)
- npm packages: `@supabase/supabase-js`, `@supabase/ssr`

### Files Modified
- `src/lib/agents/orchestrator.ts` — remove Supabase import + `triggerMetaAnalysis()`; this file stays in Next.js for reference but generation is now delegated to Lambda
- `src/hooks/useGeneration.ts` — replace direct orchestrator call with Lambda stream fetch (see Section 5)
- `src/app/archives/page.tsx` — add server-backed history from Lambda `/history` endpoint (existing localStorage display remains as fallback)
- `.env.local` — replace Supabase vars with AWS vars

### Files Added
- `src/lib/auth/cognito.ts`
- `src/lib/auth/AuthContext.tsx`
- `src/components/auth/GoogleSignInButton.tsx`
- `src/middleware.ts` (route protection)
- `lambda/` (entire Lambda project — separate from Next.js)

### Environment Variables

**Next.js `.env.local` — remove:**
```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
XAI_API_KEY=              ← moves to Lambda only
```

**Next.js `.env.local` — add:**
```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=gccp.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_LAMBDA_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws
```

**Lambda environment variables (set in AWS Console):**
```env
GEMINI_API_KEY=           ← primary AI key
DYNAMODB_TABLE_GENERATIONS=gccp-generations
DYNAMODB_TABLE_LOGS=gccp-generation-logs
DYNAMODB_TABLE_META_FEEDBACK=gccp-meta-feedback
S3_BUCKET=gccp-content
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
```

### What Does NOT Change
- All UI components (`/components/`)
- Zustand store structure (still used for in-session state)
- All styling and design system
- Export functionality (CSV/PDF)
- Event handling in `useGeneration.ts` — same event types, same Zustand dispatch
- The visible generation progress UI — same experience, now backed by real server events

---

## 8. Implementation Order

### Phase 1: AWS Infrastructure (user sets up in console — guided step by step)
1. Create Cognito User Pool + App Client
2. Configure Google as social identity provider (requires Google Cloud Console OAuth credentials)
3. Create DynamoDB tables (`gccp-generations`, `gccp-generation-logs`, `gccp-meta-feedback`)
4. Create S3 bucket (`gccp-content`) for content overflow
5. Create IAM role for Lambda (DynamoDB read/write, S3 read/write, CloudWatch logs)
6. Create Lambda function (Node.js 20.x, 512MB, 15min timeout, RESPONSE_STREAM mode)
7. Enable Lambda Function URL with CORS configured
8. Set Lambda environment variables

### Phase 2: Lambda Backend
1. Scaffold `lambda/` project with `package.json`
2. Copy + adapt agents from `src/lib/agents/` (apply code changes listed in Section 5)
3. Implement `services/dynamo.ts` — DynamoDB CRUD helpers
4. Implement `services/s3.ts` — content overflow helpers
5. Implement `services/auth.ts` — Cognito JWKS JWT verification
6. Implement `routes/generate.ts` — streaming generation handler
7. Implement `routes/history.ts` — history + single-generation endpoints
8. Implement `handler.ts` — entry point with routing + CORS
9. Deploy to Lambda (zip + upload or SAM CLI)
10. Test streaming end-to-end

### Phase 3: Next.js Frontend
1. Install `amazon-cognito-identity-js`
2. Add `src/lib/auth/cognito.ts` + `AuthContext.tsx`
3. Add `GoogleSignInButton.tsx` + login page
4. Add `middleware.ts` for route protection
5. Update `useGeneration.ts` — Lambda stream fetch
6. Update archives page — add server-backed history
7. Remove Supabase packages + dead code
8. Update environment variables
9. Test full auth + generation + history flow

### Phase 4: Integration Testing
- Sign in with Google → verify Cognito token
- Trigger generation → verify real-time stream events appear in UI
- Verify all 7 agent events appear in correct order
- Verify DynamoDB stores full result
- Verify history page shows past generations across fresh browser sessions
- Verify S3 overflow for large content

---

## 9. Deployment Tooling

**Lambda deployment:** SAM CLI (AWS Serverless Application Model) — free, straightforward for a single Lambda. Alternatively, manual zip upload via AWS Console for simplicity.

**Frontend hosting:** Stays on current host (Vercel or local) — no change needed.
