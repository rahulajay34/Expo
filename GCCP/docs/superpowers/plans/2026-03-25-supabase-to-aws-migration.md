# Supabase → AWS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with AWS (Cognito + Lambda streaming + DynamoDB) enabling Google Sign-In, server-side AI generation with real-time UI updates, and full per-user content history.

**Architecture:** Next.js frontend calls a Lambda Function URL for generation (NDJSON streaming, same event types as current client-side orchestrator). Cognito handles Google OAuth. DynamoDB stores all generation data per user. Frontend auth uses `amazon-cognito-identity-js` with localStorage tokens + a presence cookie for middleware routing.

**Tech Stack:** AWS Lambda (Node.js 20.x, RESPONSE_STREAM), DynamoDB, S3, Cognito User Pool, `amazon-cognito-identity-js`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `jose` (JWT), `esbuild` (Lambda bundling)

**Spec:** `docs/superpowers/specs/2026-03-25-supabase-to-aws-migration-design.md`

---

> **IMPORTANT — Read before starting:**
> - No test framework exists in this repo. Verification steps use `curl` for Lambda and browser dev tools for frontend.
> - The orchestrator uses `AnthropicClient` as an alias for `GeminiClient`. In Lambda we import `GeminiClient` directly.
> - `orchestrator.generate()` is an async generator — in Lambda we adapt it to write to a `responseStream` instead of yielding events.
> - Ask the user for AWS Console values (User Pool ID, Client ID, Lambda URL) before starting Phase 3. The plan flags exactly when.
> - Phase 1 is done by the user in AWS Console. The plan provides step-by-step instructions for the user, not code.

---

## Phase 1: AWS Infrastructure Setup
> **This phase is done by the USER in the AWS Console.** The implementer provides instructions and waits for values.

---

### Task 1: Create Cognito User Pool

**Files:** None (AWS Console steps)

- [ ] **Step 1: Guide user to create Cognito User Pool**

Tell the user:

```
Go to: AWS Console → Cognito → Create user pool

Settings to use:
- Sign-in options: select "Email"
- Password policy: use Cognito defaults
- MFA: No MFA (for now)
- Self-service sign-up: ENABLED
- Attribute verification: Email (Cognito will send verification)
- User pool name: gccp-user-pool
- Click "Next" through remaining defaults, then "Create user pool"

After creation, copy the User Pool ID (format: us-east-1_xxxxxxxxx)
→ Share it here before continuing.
```

- [ ] **Step 2: Create App Client**

Tell the user:

```
In your new user pool → App integration tab → App clients → Create app client

Settings:
- App type: Public client
- App client name: gccp-web-app
- Client secret: DO NOT generate (uncheck)
- Authentication flows: Check "ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"
- Callback URLs: http://localhost:3000/auth/callback
  (add your production URL here too when deploying)
- Sign-out URLs: http://localhost:3000
- OAuth 2.0: Enable "Authorization code grant"
- OpenID Connect scopes: Check "openid", "email", "profile"
- Click "Create app client"

Copy the Client ID (long alphanumeric string)
→ Share it here before continuing.
```

- [ ] **Step 3: Set up Cognito Domain**

Tell the user:

```
In your user pool → App integration tab → Domain → Create Cognito domain

Domain prefix: gccp-yourname (must be globally unique, e.g. gccp-rahul)
→ Full domain will be: gccp-yourname.auth.us-east-1.amazoncognito.com

Click "Create Cognito domain"
→ Share the full domain URL here before continuing.
```

---

### Task 2: Configure Google Sign-In

**Files:** None (Google Cloud Console + AWS Console)

- [ ] **Step 1: Guide user to create Google OAuth credentials**

Tell the user:

```
Go to: console.cloud.google.com → New project (or existing) → APIs & Services → Credentials

1. Click "Create Credentials" → "OAuth client ID"
2. Application type: Web application
3. Name: GCCP
4. Authorized redirect URIs — add BOTH:
   https://gccp-yourname.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   (replace gccp-yourname with your actual Cognito domain prefix)

5. Click "Create"
→ Copy the Client ID and Client Secret
→ Share them here (these go into AWS, NOT into your app code)
```

- [ ] **Step 2: Link Google as identity provider in Cognito**

Tell the user:

```
In your Cognito user pool → Sign-in experience → Federated identity providers → Add provider

Provider: Google
- Google client ID: (paste from previous step)
- Google client secret: (paste from previous step)
- Authorize scope: "profile email openid"
- Attribute mapping:
    email → email
    sub → username (or leave as Cognito default)

Click "Add provider"
```

- [ ] **Step 3: Enable Google in App Client**

Tell the user:

```
In your user pool → App integration → App clients → gccp-web-app → Edit

Under "Identity providers": check "Google"
Save changes.
```

---

### Task 3: Create DynamoDB Tables

**Files:** None (AWS Console)

- [ ] **Step 1: Create gccp-generations table**

Tell the user:

```
Go to: AWS Console → DynamoDB → Tables → Create table

Table name: gccp-generations
Partition key: userId (String)
Sort key: generationId (String)
Table settings: Default settings (On-demand capacity)
Click "Create table"
```

- [ ] **Step 2: Create gccp-generation-logs table**

Tell the user:

```
Create table:
Table name: gccp-generation-logs
Partition key: generationId (String)
Sort key: logId (String)
Table settings: Default settings
Click "Create table"
```

- [ ] **Step 3: Create gccp-meta-feedback table**

Tell the user:

```
Create table:
Table name: gccp-meta-feedback
Partition key: userId (String)
Sort key: mode (String)
Table settings: Default settings
Click "Create table"
```

---

### Task 4: Create S3 Bucket

**Files:** None (AWS Console)

- [ ] **Step 1: Create content overflow bucket**

Tell the user:

```
Go to: AWS Console → S3 → Create bucket

Bucket name: gccp-content-<yourname> (must be globally unique, e.g. gccp-content-rahul)
Region: us-east-1 (same as everything else)
Block all public access: ON (leave default)
Click "Create bucket"

→ Share the exact bucket name here before continuing.
```

---

### Task 5: Create IAM Role + Lambda Function

**Files:** None (AWS Console)

- [ ] **Step 1: Create IAM role for Lambda**

Tell the user:

```
Go to: AWS Console → IAM → Roles → Create role

Trusted entity: AWS service → Lambda
Permissions: Add these managed policies:
  - AWSLambdaBasicExecutionRole (for CloudWatch logs)

Also add an inline policy (JSON):
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/gccp-generations",
        "arn:aws:dynamodb:us-east-1:*:table/gccp-generation-logs",
        "arn:aws:dynamodb:us-east-1:*:table/gccp-meta-feedback"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::gccp-content-<yourname>/*"
    }
  ]
}

Role name: gccp-lambda-role
Click "Create role"
```

- [ ] **Step 2: Create Lambda function**

Tell the user:

```
Go to: AWS Console → Lambda → Create function

Settings:
- Function name: gccp-generation-api
- Runtime: Node.js 20.x
- Architecture: x86_64
- Execution role: Use existing role → gccp-lambda-role
Click "Create function"

Then in Configuration tab:
- General configuration → Edit → Timeout: 15 min 0 sec, Memory: 512 MB → Save
```

- [ ] **Step 3: Enable Function URL with streaming**

Tell the user:

```
In your Lambda function → Configuration → Function URL → Create function URL

Auth type: NONE
Invoke mode: RESPONSE_STREAM
CORS: Configure
  Allow origins: http://localhost:3000 (add production URL too)
  Allow headers: Content-Type, Authorization
  Allow methods: GET, POST, OPTIONS
  Max age: 86400

Click "Save"
→ Copy the Function URL (format: https://xxxxxxxxxx.lambda-url.us-east-1.on.aws)
→ Share it here before continuing.
```

- [ ] **Step 4: Set Lambda environment variables**

Tell the user:

```
In your Lambda function → Configuration → Environment variables → Edit → Add:

GEMINI_API_KEY = (your Gemini API key)
DYNAMODB_TABLE_GENERATIONS = gccp-generations
DYNAMODB_TABLE_LOGS = gccp-generation-logs
DYNAMODB_TABLE_META_FEEDBACK = gccp-meta-feedback
S3_BUCKET = gccp-content-<yourname>
COGNITO_USER_POOL_ID = (your pool ID from Task 1)
ALLOWED_ORIGINS = http://localhost:3000

NOTE: Do NOT add AWS_REGION manually — Lambda automatically injects it.

Click "Save"
```

> ✅ **Phase 1 complete. Collect from user before Phase 2:**
> - `COGNITO_USER_POOL_ID` (e.g. `us-east-1_xxxxxxxxx`)
> - `COGNITO_CLIENT_ID`
> - `COGNITO_DOMAIN` (e.g. `gccp-rahul.auth.us-east-1.amazoncognito.com`)
> - `LAMBDA_URL` (e.g. `https://xxxxxxxxxx.lambda-url.us-east-1.on.aws`)
> - `S3_BUCKET` name

---

## Phase 2: Lambda Backend

> All files in `lambda/` at the root of the Next.js project (sibling to `src/`).

---

### Task 6: Scaffold Lambda Project

**Files:**
- Create: `lambda/package.json`
- Create: `lambda/tsconfig.json`
- Create: `lambda/build.sh`

- [ ] **Step 1: Create lambda directory and package.json**

```bash
mkdir -p lambda/routes lambda/services lambda/utils lambda/agents/utils
```

Create `lambda/package.json`:

```json
{
  "name": "gccp-lambda",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "bash build.sh",
    "deploy": "bash build.sh && aws lambda update-function-code --function-name gccp-generation-api --zip-file fileb://dist/function.zip"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@google/generative-ai": "^0.24.1",
    "jose": "^5.9.6",
    "uuid": "^10.0.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^20",
    "@types/uuid": "^10",
    "@types/lodash": "^4.17.0",
    "esbuild": "^0.24.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `lambda/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create build script**

Create `lambda/build.sh`:

```bash
#!/bin/bash
set -e
echo "Building Lambda..."
mkdir -p dist
# Bundle to single file with esbuild
npx esbuild handler.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --external:@aws-sdk/* \
  --minify
# Zip for deployment
cd dist && zip -r function.zip index.js && cd ..
echo "Built: dist/function.zip"
```

- [ ] **Step 4: Add lambda/dist to .gitignore**

```bash
grep -q "lambda/dist" /Users/rahul/Desktop/Expo/GCCP/.gitignore || echo "lambda/dist/" >> /Users/rahul/Desktop/Expo/GCCP/.gitignore
grep -q "lambda/node_modules" /Users/rahul/Desktop/Expo/GCCP/.gitignore || echo "lambda/node_modules/" >> /Users/rahul/Desktop/Expo/GCCP/.gitignore
```

- [ ] **Step 5: Install dependencies**

```bash
cd lambda && npm install
```

- [ ] **Step 6: Verify structure**

```bash
ls lambda/
# Should show: package.json tsconfig.json build.sh routes/ services/ utils/ agents/ node_modules/
```

- [ ] **Step 7: Commit**

```bash
git add lambda/ .gitignore
git commit -m "feat: scaffold Lambda project structure"
```

---

### Task 7: Implement JWT Auth Service

**Files:**
- Create: `lambda/services/auth.ts`

- [ ] **Step 1: Create auth.ts**

Create `lambda/services/auth.ts`:

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const REGION = process.env.AWS_REGION || 'us-east-1';

// Cognito JWKS URL — cached automatically by jose
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export interface AuthUser {
  userId: string; // Cognito sub
  email: string;
}

/**
 * Verify a Cognito ID token and return the user identity.
 * Throws if token is invalid or expired.
 */
export async function verifyToken(authHeader: string | undefined): Promise<AuthUser> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
  });
  const userId = payload.sub as string;
  const email = (payload.email as string) || '';
  if (!userId) throw new Error('Token missing sub claim');
  return { userId, email };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd lambda && npx tsc --noEmit
# Should produce no errors for auth.ts
```

- [ ] **Step 3: Commit**

```bash
git add lambda/services/auth.ts
git commit -m "feat: add Cognito JWT verification service"
```

---

### Task 8: Implement DynamoDB Service

**Files:**
- Create: `lambda/services/dynamo.ts`

- [ ] **Step 1: Create dynamo.ts**

Create `lambda/services/dynamo.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// AWS_REGION is injected automatically by Lambda runtime — no need to set it manually
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
export const ddb = DynamoDBDocumentClient.from(client);

const TABLE_GENERATIONS = process.env.DYNAMODB_TABLE_GENERATIONS!;
const TABLE_LOGS = process.env.DYNAMODB_TABLE_LOGS!;
const TABLE_META = process.env.DYNAMODB_TABLE_META_FEEDBACK!;

export function makeGenerationId(): string {
  return `GEN#${new Date().toISOString()}#${uuidv4().slice(0, 8)}`;
}

// ── Generations ──────────────────────────────────────────────────────────────

export async function createGeneration(
  userId: string,
  generationId: string,
  params: Record<string, any>
): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE_GENERATIONS,
    Item: {
      userId,
      generationId,
      topic: params.topic,
      mode: params.mode,
      subtopics: params.subtopics || [],
      transcript: params.transcript || '',
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function updateGenerationComplete(
  userId: string,
  generationId: string,
  data: {
    finalContent?: string;
    finalContentS3Key?: string;
    assignmentData?: any;
    gapAnalysis?: any;
    estimatedCost?: number;
    status: 'completed' | 'failed';
    errorMessage?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, any> = {
    ':updatedAt': new Date().toISOString(),
    ':status': data.status,
  };

  updates.push('#status = :status', '#updatedAt = :updatedAt');
  names['#status'] = 'status';
  names['#updatedAt'] = 'updatedAt';

  if (data.finalContent !== undefined) {
    updates.push('#fc = :fc');
    names['#fc'] = 'finalContent';
    values[':fc'] = data.finalContent;
  }
  if (data.finalContentS3Key !== undefined) {
    updates.push('#fcs3 = :fcs3');
    names['#fcs3'] = 'finalContentS3Key';
    values[':fcs3'] = data.finalContentS3Key;
  }
  if (data.assignmentData !== undefined) {
    updates.push('#ad = :ad');
    names['#ad'] = 'assignmentData';
    values[':ad'] = data.assignmentData;
  }
  if (data.gapAnalysis !== undefined) {
    updates.push('#ga = :ga');
    names['#ga'] = 'gapAnalysis';
    values[':ga'] = data.gapAnalysis;
  }
  if (data.estimatedCost !== undefined) {
    updates.push('#ec = :ec');
    names['#ec'] = 'estimatedCost';
    values[':ec'] = data.estimatedCost;
  }
  if (data.errorMessage !== undefined) {
    updates.push('#em = :em');
    names['#em'] = 'errorMessage';
    values[':em'] = data.errorMessage;
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE_GENERATIONS,
    Key: { userId, generationId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function getGeneration(userId: string, generationId: string): Promise<any | null> {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_GENERATIONS,
    Key: { userId, generationId },
  }));
  return result.Item || null;
}

export async function listGenerations(userId: string, limit = 50): Promise<any[]> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_GENERATIONS,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false, // newest first
    Limit: limit,
    ProjectionExpression: 'userId, generationId, topic, #m, #s, createdAt, estimatedCost',
    ExpressionAttributeNames: { '#m': 'mode', '#s': 'status' },
  }));
  return result.Items || [];
}

// ── Generation Logs ──────────────────────────────────────────────────────────

let logSequence = 0;

export async function appendLog(
  generationId: string,
  agentName: string,
  message: string,
  logType: 'info' | 'success' | 'error' | 'step',
  metadata?: Record<string, any>
): Promise<void> {
  logSequence++;
  const seq = String(logSequence).padStart(6, '0');
  const logId = `LOG#${new Date().toISOString()}#${seq}`;
  await ddb.send(new PutCommand({
    TableName: TABLE_LOGS,
    Item: {
      generationId,
      logId,
      agentName,
      message,
      logType,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    },
  }));
}

export async function getLogs(generationId: string): Promise<any[]> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_LOGS,
    KeyConditionExpression: 'generationId = :gid',
    ExpressionAttributeValues: { ':gid': generationId },
    ScanIndexForward: true,
  }));
  return result.Items || [];
}

// ── Meta Feedback ─────────────────────────────────────────────────────────────

export async function getMetaFeedback(userId: string, mode: string): Promise<any | null> {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_META,
    Key: { userId, mode },
  }));
  return result.Item || null;
}

export async function upsertMetaFeedback(
  userId: string,
  mode: string,
  feedbackContent: any,
  generationCount: number
): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE_META,
    Item: {
      userId,
      mode,
      feedbackContent,
      generationCount,
      lastUpdated: new Date().toISOString(),
    },
  }));
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd lambda && npx tsc --noEmit
# No errors expected
```

- [ ] **Step 3: Commit**

```bash
git add lambda/services/dynamo.ts
git commit -m "feat: add DynamoDB service layer"
```

---

### Task 9: Implement S3 Service

**Files:**
- Create: `lambda/services/s3.ts`

- [ ] **Step 1: Create s3.ts**

Create `lambda/services/s3.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET!;
const SIZE_THRESHOLD_BYTES = 300 * 1024; // 300KB

export function isLargeContent(content: string): boolean {
  return Buffer.byteLength(content, 'utf8') > SIZE_THRESHOLD_BYTES;
}

export async function uploadContent(userId: string, generationId: string, content: string): Promise<string> {
  // S3 key: userId/generationId.md
  const key = `${userId}/${generationId.replace(/[^a-zA-Z0-9_\-#.]/g, '_')}.md`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
  }));
  return key;
}

export async function downloadContent(s3Key: string): Promise<string> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Store content — if large, puts in S3 and returns { s3Key, finalContent: undefined }.
 * If small, returns { finalContent: content, s3Key: undefined }.
 */
export async function storeContent(
  userId: string,
  generationId: string,
  content: string
): Promise<{ finalContent?: string; finalContentS3Key?: string }> {
  if (isLargeContent(content)) {
    const s3Key = await uploadContent(userId, generationId, content);
    return { finalContentS3Key: s3Key };
  }
  return { finalContent: content };
}
```

- [ ] **Step 2: Verify compiles**

```bash
cd lambda && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lambda/services/s3.ts
git commit -m "feat: add S3 service for large content overflow"
```

---

### Task 10: Copy and Adapt Agent Files

**Files:**
- Copy all from `src/lib/agents/` → `lambda/agents/`
- Copy utilities from `src/lib/utils/` → `lambda/utils/`
- Copy Gemini client `src/lib/gemini/client.ts` → `lambda/gemini/client.ts`

- [ ] **Step 1: Copy agent files**

```bash
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/agents/*.ts /Users/rahul/Desktop/Expo/GCCP/lambda/agents/
cp -r /Users/rahul/Desktop/Expo/GCCP/src/lib/agents/utils/ /Users/rahul/Desktop/Expo/GCCP/lambda/agents/utils/
```

- [ ] **Step 2: Copy utilities**

```bash
mkdir -p /Users/rahul/Desktop/Expo/GCCP/lambda/utils
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/cache.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/semantic-cache.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/context-manager.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/ 2>/dev/null || true
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/quality-gate.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/ 2>/dev/null || true
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/env-logger.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/ 2>/dev/null || true
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/logger.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/ 2>/dev/null || true
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/utils/subtopic-normalizer.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/ 2>/dev/null || true
```

- [ ] **Step 3: Copy Gemini client and token counter**

```bash
mkdir -p /Users/rahul/Desktop/Expo/GCCP/lambda/gemini
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/gemini/client.ts /Users/rahul/Desktop/Expo/GCCP/lambda/gemini/

# Read src/lib/anthropic/token-counter.ts first — it may re-export from gemini/token-counter.ts
# If so, copy the gemini version as the source of truth:
cat /Users/rahul/Desktop/Expo/GCCP/src/lib/anthropic/token-counter.ts
# If it contains import from '@/lib/gemini/token-counter', use gemini version:
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/gemini/token-counter.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/token-counter.ts 2>/dev/null || \
cp /Users/rahul/Desktop/Expo/GCCP/src/lib/anthropic/token-counter.ts /Users/rahul/Desktop/Expo/GCCP/lambda/utils/token-counter.ts 2>/dev/null || true
```

- [ ] **Step 4: Copy types**

```bash
mkdir -p /Users/rahul/Desktop/Expo/GCCP/lambda/types
cp /Users/rahul/Desktop/Expo/GCCP/src/types/content.ts /Users/rahul/Desktop/Expo/GCCP/lambda/types/
cp /Users/rahul/Desktop/Expo/GCCP/src/types/assignment.ts /Users/rahul/Desktop/Expo/GCCP/lambda/types/
# Copy prompts
mkdir -p /Users/rahul/Desktop/Expo/GCCP/lambda/prompts
cp -r /Users/rahul/Desktop/Expo/GCCP/src/prompts/ /Users/rahul/Desktop/Expo/GCCP/lambda/prompts/
```

- [ ] **Step 5: Fix imports in all agent files**

In all copied files under `lambda/agents/` and `lambda/utils/`, replace Next.js path aliases with relative paths:

```bash
cd /Users/rahul/Desktop/Expo/GCCP/lambda

# Fix @/lib/agents/ → ./  or ../agents/
# Fix @/lib/utils/ → ../utils/
# Fix @/lib/anthropic/ → ../utils/ (token-counter) or ../gemini/
# Fix @/lib/gemini/ → ../gemini/
# Fix @/lib/services/ → (remove - meta-feedback is gone)
# Fix @/types/ → ../types/
# Fix @/prompts/ → ../prompts/

# Use sed to do bulk replacements:
find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" | xargs sed -i '' \
  -e "s|@/lib/agents/|./|g" \
  -e "s|@/lib/utils/cache|../utils/cache|g" \
  -e "s|@/lib/utils/semantic-cache|../utils/semantic-cache|g" \
  -e "s|@/lib/utils/context-manager|../utils/context-manager|g" \
  -e "s|@/lib/utils/quality-gate|../utils/quality-gate|g" \
  -e "s|@/lib/utils/env-logger|../utils/env-logger|g" \
  -e "s|@/lib/utils/logger|../utils/logger|g" \
  -e "s|@/lib/anthropic/token-counter|../utils/token-counter|g" \
  -e "s|@/lib/anthropic/client|../gemini/client|g" \
  -e "s|@/lib/gemini/client|../gemini/client|g" \
  -e "s|@/types/content|../types/content|g" \
  -e "s|@/types/assignment|../types/assignment|g" \
  -e "s|@/prompts/|../prompts/|g"
```

- [ ] **Step 6: Fix orchestrator.ts — remove Supabase, add performance import, fix client**

Edit `lambda/agents/orchestrator.ts`:

a) Remove these imports at the top:
```typescript
// REMOVE these two lines:
import { MetaFeedbackService } from "@/lib/services/meta-feedback";
import { createClient } from "@supabase/supabase-js";
```

b) Add `performance` import at the top:
```typescript
import { performance } from 'perf_hooks';
```

c) Change `AnthropicClient` import to use `GeminiClient` directly:
```typescript
// CHANGE:
import { AnthropicClient } from "@/lib/anthropic/client";
// TO:
import { GeminiClient as AnthropicClient } from "../gemini/client";
```

d) Delete the entire `triggerMetaAnalysis()` method (lines ~120-164 in original).

e) Remove the `triggerMetaAnalysis()` call at the end of `generate()` (the fire-and-forget block with `.catch()`).

f) Change the `Orchestrator` constructor to not require apiKey parameter — read from env:
```typescript
// CHANGE constructor from:
constructor(apiKey: string) {
  this.client = new AnthropicClient(apiKey);
// TO:
constructor() {
  this.client = new AnthropicClient(process.env.GEMINI_API_KEY!);
```

- [ ] **Step 7: Verify Lambda agents compile**

```bash
cd lambda && npx tsc --noEmit 2>&1 | head -50
# Fix any remaining import errors one by one
```

- [ ] **Step 8: Commit**

```bash
cd /Users/rahul/Desktop/Expo/GCCP
git add lambda/agents/ lambda/utils/ lambda/gemini/ lambda/types/ lambda/prompts/
git commit -m "feat: copy and adapt agents + utils to Lambda"
```

---

### Task 11: Implement Generate Route (Streaming)

**Files:**
- Create: `lambda/routes/generate.ts`

- [ ] **Step 1: Create generate.ts**

Create `lambda/routes/generate.ts`:

```typescript
import { Orchestrator } from '../agents/orchestrator';
import {
  createGeneration,
  updateGenerationComplete,
  appendLog,
  makeGenerationId,
} from '../services/dynamo';
import { storeContent } from '../services/s3';
import { AuthUser } from '../services/auth';

/**
 * Write a NDJSON event line to the response stream.
 * Each event is a JSON object terminated by newline.
 */
function writeEvent(stream: NodeJS.WritableStream, event: Record<string, any>): void {
  stream.write(JSON.stringify(event) + '\n');
}

export async function handleGenerate(
  body: string,
  responseStream: NodeJS.WritableStream,
  user: AuthUser
): Promise<void> {
  const params = JSON.parse(body);
  const generationId = makeGenerationId();

  // Create DynamoDB record immediately (status: processing)
  await createGeneration(user.userId, generationId, params);

  // Tell the client the generation ID so it can poll/link history
  writeEvent(responseStream, { type: 'job_created', generationId });

  const orchestrator = new Orchestrator();
  let finalContent = '';
  let assignmentData: any = null;
  let gapAnalysis: any = null;
  let estimatedCost = 0;
  let failed = false;

  try {
    // Create an AbortController for stop support (future feature)
    const controller = new AbortController();
    const generator = orchestrator.generate(params, controller.signal);

    for await (const event of generator) {
      // Forward every event to the browser immediately
      writeEvent(responseStream, event);

      // Capture key data as it streams through
      if (event.type === 'replace' || event.type === 'chunk') {
        // Track content accumulation
        if (event.type === 'replace') finalContent = event.content as string || '';
        else if (event.type === 'chunk') finalContent += event.content as string || '';
      } else if (event.type === 'formatted') {
        // Formatted content is the final clean version
        finalContent = event.content as string || finalContent;
      } else if (event.type === 'gap_analysis') {
        gapAnalysis = event.content;
      } else if (event.type === 'complete') {
        estimatedCost = typeof event.cost === 'number' ? event.cost : 0;
        // Log step to DynamoDB
        await appendLog(generationId, 'System', 'Generation completed', 'success', { cost: estimatedCost });
      } else if (event.type === 'step') {
        // Persist each meaningful step to DynamoDB logs
        await appendLog(
          generationId,
          event.agent || 'System',
          event.message || '',
          'step',
          { action: event.action, status: event.status }
        );
      } else if (event.type === 'error') {
        await appendLog(generationId, event.agent || 'System', event.message || 'Error', 'error');
      }
    }
  } catch (err: any) {
    failed = true;
    writeEvent(responseStream, { type: 'fatal', message: err.message || 'Generation failed' });
    await updateGenerationComplete(user.userId, generationId, {
      status: 'failed',
      errorMessage: err.message,
    });
    return;
  }

  // For assignment mode: final content is JSON — parse it as assignmentData
  if (params.mode === 'assignment' && finalContent) {
    try { assignmentData = JSON.parse(finalContent); } catch { /* not JSON, leave null */ }
  }

  // Persist final content to DynamoDB (S3 overflow if large)
  const contentStorage = await storeContent(user.userId, generationId, finalContent);

  await updateGenerationComplete(user.userId, generationId, {
    ...contentStorage,
    assignmentData,
    gapAnalysis,
    estimatedCost,
    status: 'completed',
  });
}
```

- [ ] **Step 2: Verify compiles**

```bash
cd lambda && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lambda/routes/generate.ts
git commit -m "feat: add streaming generate route"
```

---

### Task 12: Implement History Route

**Files:**
- Create: `lambda/routes/history.ts`

- [ ] **Step 1: Create history.ts**

Create `lambda/routes/history.ts`:

```typescript
import { getGeneration, getLogs, listGenerations } from '../services/dynamo';
import { downloadContent } from '../services/s3';
import { AuthUser } from '../services/auth';

export async function handleListHistory(user: AuthUser): Promise<object> {
  const items = await listGenerations(user.userId);
  return { generations: items };
}

export async function handleGetGeneration(
  generationId: string,
  user: AuthUser
): Promise<object> {
  const generation = await getGeneration(user.userId, generationId);
  if (!generation) {
    return { error: 'Not found' };
  }

  // Fetch content from S3 if stored there
  if (generation.finalContentS3Key && !generation.finalContent) {
    generation.finalContent = await downloadContent(generation.finalContentS3Key);
  }

  const logs = await getLogs(generationId);
  return { generation, logs };
}
```

- [ ] **Step 2: Verify compiles**

```bash
cd lambda && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lambda/routes/history.ts
git commit -m "feat: add history and generation retrieval routes"
```

---

### Task 13: Implement Lambda Handler (Entry Point)

**Files:**
- Create: `lambda/handler.ts`

- [ ] **Step 1: Create handler.ts**

Create `lambda/handler.ts`:

```typescript
import { verifyToken } from './services/auth';
import { handleGenerate } from './routes/generate';
import { handleListHistory, handleGetGeneration } from './routes/history';

// AWS Lambda streaming response types
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: any,
      responseStream: NodeJS.WritableStream,
      context: any
    ) => Promise<void>
  ) => any;
  HttpResponseStream: {
    from: (stream: NodeJS.WritableStream, metadata: any) => NodeJS.WritableStream;
  };
};

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export const handler = awslambda.streamifyResponse(
  async (event: any, responseStream: NodeJS.WritableStream, _context: any) => {
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.rawPath || event.path || '/';

    // Handle CORS preflight — AWS handles OPTIONS automatically at Function URL level,
    // but handle here as fallback
    if (method === 'OPTIONS') {
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 204,
        headers: corsHeaders(origin),
      });
      stream.end();
      return;
    }

    // Verify JWT for all non-OPTIONS requests
    let user;
    try {
      user = await verifyToken(event.headers?.authorization || event.headers?.Authorization);
    } catch (err: any) {
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
      stream.write(JSON.stringify({ error: 'Unauthorized', message: err.message }));
      stream.end();
      return;
    }

    // Route: POST /generate — streaming NDJSON
    if (path === '/generate' && method === 'POST') {
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
        },
      });
      try {
        await handleGenerate(event.body || '{}', stream, user);
      } finally {
        stream.end();
      }
      return;
    }

    // Route: GET /history
    if (path === '/history' && method === 'GET') {
      const result = await handleListHistory(user);
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
      stream.write(JSON.stringify(result));
      stream.end();
      return;
    }

    // Route: GET /generation/:id
    const genMatch = path.match(/^\/generation\/(.+)$/);
    if (genMatch && method === 'GET') {
      const generationId = decodeURIComponent(genMatch[1]);
      const result = await handleGetGeneration(generationId, user);
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
      stream.write(JSON.stringify(result));
      stream.end();
      return;
    }

    // 404
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 404,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
    stream.write(JSON.stringify({ error: 'Not found' }));
    stream.end();
  }
);
```

- [ ] **Step 2: Add ALLOWED_ORIGINS env var to Lambda**

Tell the user:

```
Go to Lambda → Configuration → Environment variables → Edit → Add:
ALLOWED_ORIGINS = http://localhost:3000,https://<your-production-domain>
```

- [ ] **Step 3: Verify compiles**

```bash
cd lambda && npx tsc --noEmit
# Should produce no errors
```

- [ ] **Step 4: Commit**

```bash
git add lambda/handler.ts
git commit -m "feat: add Lambda handler with routing and CORS"
```

---

### Task 14: Build and Deploy Lambda

**Files:** None (build + deploy)

- [ ] **Step 1: Build**

```bash
cd lambda && npm run build
# Expected: Built: dist/function.zip
ls -lh dist/function.zip
# Should be < 50MB
```

- [ ] **Step 2: Upload to Lambda**

Tell the user:

```
Go to: AWS Console → Lambda → gccp-generation-api → Code tab → Upload from → .zip file

Upload: lambda/dist/function.zip
Handler: index.handler
Save
```

Alternatively, if AWS CLI is configured:

```bash
cd lambda && npm run deploy
# This runs: aws lambda update-function-code --function-name gccp-generation-api --zip-file fileb://dist/function.zip
```

- [ ] **Step 3: Test Lambda is alive**

```bash
LAMBDA_URL="https://xxxxxxxxxx.lambda-url.us-east-1.on.aws"

# Should get 401 (no token) — Lambda is running
curl -s -X POST "$LAMBDA_URL/generate" -H "Content-Type: application/json" | head -5
# Expected: {"error":"Unauthorized","message":"Missing or invalid Authorization header"}
```

- [ ] **Step 4: Commit**

```bash
git add lambda/
git commit -m "feat: Lambda backend complete — ready for frontend integration"
```

---

## Phase 3: Next.js Frontend

---

### Task 15: Install Auth Library

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install amazon-cognito-identity-js**

```bash
cd /Users/rahul/Desktop/Expo/GCCP && npm install amazon-cognito-identity-js
```

- [ ] **Step 2: Verify install**

```bash
ls node_modules/amazon-cognito-identity-js
# Should exist
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add amazon-cognito-identity-js"
```

---

### Task 16: Create Cognito Auth Helpers

**Files:**
- Create: `src/lib/auth/cognito.ts`

- [ ] **Step 1: Create cognito.ts**

Create `src/lib/auth/cognito.ts`:

```typescript
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;

export const userPool = new CognitoUserPool({
  UserPoolId: POOL_ID,
  ClientId: CLIENT_ID,
});

/** Redirect browser to Cognito Hosted UI (Google sign-in) */
export function redirectToGoogleSignIn(): void {
  const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
  const url = `https://${DOMAIN}/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid+email+profile` +
    `&redirect_uri=${callbackUrl}` +
    `&identity_provider=Google`;
  window.location.href = url;
}

/** Exchange Cognito auth code for tokens */
export async function exchangeCodeForTokens(code: string): Promise<{
  idToken: string;
  accessToken: string;
  refreshToken: string;
}> {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: callbackUrl,
  });

  const response = await fetch(`https://${DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

const TOKEN_KEY = 'gccp_id_token';
const REFRESH_KEY = 'gccp_refresh_token';

export function storeTokens(idToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, idToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  // Set presence cookie for middleware (not the token itself, just a signal)
  // Max-Age=2592000 = 30 days, matching Cognito refresh token lifetime
  // Without Max-Age it's a session cookie and clears on browser restart
  document.cookie = 'gccp-auth=1; path=/; SameSite=Lax; Max-Age=2592000';
}

export function getIdToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  // Clear presence cookie
  document.cookie = 'gccp-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

/** Parse JWT payload without verifying (client-side only, for display) */
export function parseTokenPayload(token: string): Record<string, any> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

/** Refresh the ID token using the refresh token */
export async function refreshIdToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(`https://${DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.id_token);
    return data.id_token;
  } catch {
    clearTokens();
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth/cognito.ts
git commit -m "feat: add Cognito auth helpers"
```

---

### Task 17: Create AuthContext

**Files:**
- Create: `src/lib/auth/AuthContext.tsx`

- [ ] **Step 1: Create AuthContext.tsx**

Create `src/lib/auth/AuthContext.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getIdToken,
  parseTokenPayload,
  clearTokens,
  refreshIdToken,
  redirectToGoogleSignIn,
} from './cognito';

interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  idToken: string | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  idToken: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    let token = getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Check if token is expired (JWT exp claim)
    const payload = parseTokenPayload(token);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      // Try refresh
      token = await refreshIdToken();
      if (!token) {
        setLoading(false);
        return;
      }
    }

    const freshPayload = parseTokenPayload(token);
    setIdToken(token);
    setUser({
      userId: freshPayload.sub || '',
      email: freshPayload.email || '',
      name: freshPayload.name || freshPayload.email || '',
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signIn = () => redirectToGoogleSignIn();

  const signOut = () => {
    clearTokens();
    setUser(null);
    setIdToken(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, idToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Add AuthProvider to root layout**

Edit `src/app/layout.tsx` — wrap children with `<AuthProvider>`:

```typescript
import { AuthProvider } from '@/lib/auth/AuthContext';

// In the return:
<AuthProvider>
  {children}
</AuthProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/AuthContext.tsx src/app/layout.tsx
git commit -m "feat: add AuthContext and wrap root layout"
```

---

### Task 18: Create Login Page and Auth Callback

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/page.tsx`
- Create: `src/components/auth/GoogleSignInButton.tsx`

- [ ] **Step 1: Create GoogleSignInButton**

Create `src/components/auth/GoogleSignInButton.tsx`:

```typescript
'use client';

import { redirectToGoogleSignIn } from '@/lib/auth/cognito';

export function GoogleSignInButton() {
  return (
    <button
      onClick={redirectToGoogleSignIn}
      className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 font-medium"
    >
      {/* Google logo SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  );
}
```

- [ ] **Step 2: Create login page**

Create `src/app/login/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/editor');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GCCP</h1>
          <p className="text-gray-500 mt-2 text-sm">Generated Course Content Platform</p>
        </div>
        <GoogleSignInButton />
        <p className="text-xs text-gray-400">
          Sign in to generate and save your course content
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create auth callback page**

Create `src/app/auth/callback/page.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens, storeTokens } from '@/lib/auth/cognito';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    if (!code) {
      router.push('/login');
      return;
    }

    exchangeCodeForTokens(code)
      .then(({ idToken, refreshToken }) => {
        storeTokens(idToken, refreshToken);
        router.push('/editor');
      })
      .catch((err) => {
        console.error('Auth callback error:', err);
        router.push('/login?error=auth_failed');
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login/ src/app/auth/ src/components/auth/
git commit -m "feat: add login page, auth callback, and Google sign-in button"
```

---

### Task 19: Add Middleware for Route Protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware.ts**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require auth
const PUBLIC_PATHS = ['/login', '/auth/callback', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check presence cookie (set by storeTokens() after Google sign-in)
  const authCookie = request.cookies.get('gccp-auth');
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add route protection middleware"
```

---

### Task 20: Update Environment Variables

**Files:**
- Modify: `.env.local` (create if missing)

- [ ] **Step 1: Update .env.local**

Get the following values from the user (collected during Phase 1):
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_DOMAIN`
- `LAMBDA_URL`

Edit `.env.local`:

```env
# Remove these:
# NEXT_PUBLIC_SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
# XAI_API_KEY=

# Add these (fill in real values from user):
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=gccp-yourname.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_LAMBDA_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws
```

- [ ] **Step 2: Ensure .env.local is in .gitignore**

```bash
grep -q ".env.local" /Users/rahul/Desktop/Expo/GCCP/.gitignore || echo ".env.local" >> /Users/rahul/Desktop/Expo/GCCP/.gitignore
```

- [ ] **Step 3: Commit .gitignore only**

```bash
git add .gitignore
git commit -m "chore: ensure .env.local in gitignore"
```

---

### Task 21: Update useGeneration Hook to Call Lambda

**Files:**
- Modify: `src/hooks/useGeneration.ts`

- [ ] **Step 1: Read current useGeneration.ts before editing**

Read the full file at `src/hooks/useGeneration.ts` to understand the current structure.

- [ ] **Step 2: Replace startGeneration with Lambda stream call**

In `src/hooks/useGeneration.ts`:

a) Remove these imports and the unused apiKey variable:
```typescript
// REMOVE this import:
import { Orchestrator } from '@/lib/agents/orchestrator';

// REMOVE this line inside startGeneration (line ~53):
const apiKey = process.env.XAI_API_KEY || '';
// REMOVE the lines that use apiKey:
// orchestrator = new Orchestrator(apiKey);
```

b) Add this import:
```typescript
import { useAuth } from '@/lib/auth/AuthContext';
```

c) Inside the `useGeneration` function, add:
```typescript
const { idToken } = useAuth();
```

d) Replace the entire `startGeneration` function body with:

```typescript
const startGeneration = async () => {
    if (store.status === 'generating') {
        console.warn('[useGeneration] Already generating - ignoring duplicate call');
        return;
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!idToken) {
        setError('Not authenticated. Please sign in.');
        return;
    }

    const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_URL;
    if (!lambdaUrl) {
        setError('Lambda URL not configured');
        return;
    }

    store.clearGenerationState();
    store.setStatus('generating');
    setError(null);
    store.addLog(`Starting generation for topic: ${store.topic}`, 'info');

    const params = {
        topic: store.topic,
        subtopics: store.subtopics,
        mode: store.mode,
        transcript: store.transcript || '',
        additionalInstructions: '',
        assignmentCounts: store.assignmentCounts,
    };

    try {
        const response = await fetch(`${lambdaUrl}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(params),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server error ${response.status}: ${errText}`);
        }

        if (!response.body) throw new Error('No response body from Lambda');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            if (controller.signal.aborted) break;

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;
                let event: any;
                try {
                    event = JSON.parse(line);
                } catch {
                    continue; // skip malformed lines
                }

                // Dispatch to Zustand store — same as before
                if (event.type === 'step') {
                    store.setCurrentAgent(event.agent || 'System');
                    store.setCurrentAction(event.action || event.message || '');
                    store.addStepLog(event.agent || 'System', event.message || '');
                } else if (event.type === 'chunk') {
                    store.updateContent(event.content as string || '');
                } else if (event.type === 'gap_analysis') {
                    store.setGapAnalysis(event.content);
                    store.addLog('Gap analysis complete', 'success');
                } else if (event.type === 'course_detected') {
                    const courseData = event.content as any;
                    const domain = courseData?.domain || 'general';
                    const confidence = courseData?.confidence || 0;
                    store.addStepLog('CourseDetector', `Detected: ${domain} (${Math.round(confidence * 100)}%)`);
                    store.addLog(`Content domain detected: ${domain}`, 'success');
                } else if (event.type === 'instructor_quality') {
                    store.setInstructorQuality(event.content as any);
                    const iq = event.content as any;
                    store.addStepLog('InstructorQuality', `Teaching quality score: ${iq?.overallScore || 'N/A'}/10`);
                    store.addLog(`Instructor quality analysis complete (score: ${iq?.overallScore || 'N/A'})`, 'success');
                } else if (event.type === 'replace') {
                    store.setContent(event.content as string);
                    store.addLog('Content updated by agent', 'info');
                } else if (event.type === 'formatted') {
                    store.setFormattedContent(event.content as string);
                    store.addLog('Content formatted for LMS', 'success');
                } else if (event.type === 'complete') {
                    store.flushContentBuffer();
                    store.setStatus('complete');
                    store.addLog('Generation completed successfully', 'success');
                    if (typeof event.cost === 'number') {
                        store.setEstimatedCost(event.cost);
                    }
                } else if (event.type === 'job_created') {
                    store.addLog(`Job created: ${event.generationId}`, 'info');
                } else if (event.type === 'mismatch_stop') {
                    store.setStatus('mismatch');
                    store.addLog(event.message || 'Transcript mismatch detected', 'warning');
                    setError(event.message || 'Transcript does not match topic/subtopics');
                } else if (event.type === 'error') {
                    store.addLog(event.message || 'Error occurred', 'error');
                    setError(event.message || 'Unknown error');
                    store.setStatus('error');
                } else if (event.type === 'fatal') {
                    store.addLog(event.message || 'Fatal error', 'error');
                    setError(event.message || 'Generation failed');
                    store.setStatus('error');
                }
            }
        }
    } catch (e: any) {
        if (e.message === 'Aborted' || e.name === 'AbortError') {
            store.addLog('Generation stopped by user', 'warning');
            store.setStatus('idle');
        } else {
            setError(e.message);
            store.addLog(e.message, 'error');
            store.setStatus('error');
        }
    } finally {
        if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
        }
    }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGeneration.ts
git commit -m "feat: update useGeneration to call Lambda streaming endpoint"
```

---

### Task 22: Update Archives Page with Server History

**Files:**
- Modify: `src/app/archives/page.tsx`
- Create: `src/hooks/useHistory.ts`

- [ ] **Step 1: Create useHistory hook**

Create `src/hooks/useHistory.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export interface HistoryItem {
  generationId: string;
  topic: string;
  mode: string;
  status: string;
  createdAt: string;
  estimatedCost?: number;
}

export function useHistory() {
  const { idToken } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_URL;

  useEffect(() => {
    if (!idToken || !lambdaUrl) return;
    setLoading(true);
    fetch(`${lambdaUrl}/history`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(r => r.json())
      .then(data => {
        setHistory(data.generations || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [idToken, lambdaUrl]);

  return { history, loading, error };
}
```

- [ ] **Step 2: Add history section to archives page**

Read `src/app/archives/page.tsx` fully, then add at the top of the component:

```typescript
import { useHistory } from '@/hooks/useHistory';
import { useAuth } from '@/lib/auth/AuthContext';
```

Inside the `ArchivesPage` component add:

```typescript
const { user } = useAuth();
const { history, loading: historyLoading } = useHistory();
```

Then add a history section before the closing `</div>`. Place it below the existing "current generation" section:

```tsx
{/* Server-backed history */}
{user && (
  <div className="mt-8">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Past Generations</h2>
    {historyLoading ? (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
        Loading history...
      </div>
    ) : history.length === 0 ? (
      <p className="text-gray-400 text-sm">No past generations yet.</p>
    ) : (
      <div className="space-y-2">
        {history.map((item) => {
          const Icon = MODE_ICONS[item.mode] || FileText;
          const color = MODE_COLORS[item.mode] || 'bg-gray-100 text-gray-700';
          return (
            <div
              key={item.generationId}
              className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                  <Icon className="w-3 h-3" />
                  {item.mode}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.topic}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {item.estimatedCost !== undefined && (
                  <span>${item.estimatedCost.toFixed(4)}</span>
                )}
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/archives/page.tsx src/hooks/useHistory.ts
git commit -m "feat: add server-backed generation history to archives page"
```

---

### Task 23: Add User Info + Sign Out to UI

**Files:**
- Modify: Identify the main layout/header component and add user info

- [ ] **Step 1: Find the header/layout component**

```bash
ls /Users/rahul/Desktop/Expo/GCCP/src/components/layout/
```

- [ ] **Step 2: Add user avatar + sign out to header**

Read the header component, then add at the appropriate place:

```typescript
import { useAuth } from '@/lib/auth/AuthContext';

// Inside component:
const { user, signOut } = useAuth();

// In JSX, add alongside existing header content:
{user && (
  <div className="flex items-center gap-3">
    <span className="text-sm text-gray-600">{user.email}</span>
    <button
      onClick={signOut}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
    >
      Sign out
    </button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add user info and sign out to header"
```

---

### Task 24: Remove Supabase Dead Code

**Files:**
- Delete: `src/lib/queue/job-queue.ts`
- Delete: `src/lib/queue/worker.ts`
- Delete: `src/lib/services/meta-feedback.ts`
- Modify: `src/lib/agents/orchestrator.ts` (remove Supabase imports)
- Modify: `package.json` (remove Supabase packages)

- [ ] **Step 1: Remove dead files**

```bash
cd /Users/rahul/Desktop/Expo/GCCP
rm src/lib/queue/job-queue.ts
rm src/lib/queue/worker.ts
rm src/lib/services/meta-feedback.ts
# Remove the queue directory if empty
rmdir src/lib/queue 2>/dev/null || true
```

- [ ] **Step 2: Remove Supabase from orchestrator.ts**

Edit `src/lib/agents/orchestrator.ts`:

a) Remove these imports:
```typescript
// DELETE these lines:
import { MetaFeedbackService } from "@/lib/services/meta-feedback";
import { createClient } from "@supabase/supabase-js";
```

b) Delete the entire `triggerMetaAnalysis()` private method.

c) Remove the `triggerMetaAnalysis()` call at the bottom of `generate()` (the `.catch()` block).

- [ ] **Step 3: Remove Supabase npm packages**

```bash
npm uninstall @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 4: Verify no remaining Supabase references**

```bash
grep -r "supabase" /Users/rahul/Desktop/Expo/GCCP/src/ --include="*.ts" --include="*.tsx" -l
# Should return empty (no files)
```

- [ ] **Step 5: Verify build compiles**

```bash
cd /Users/rahul/Desktop/Expo/GCCP && npm run build 2>&1 | tail -20
# Should succeed with no type errors
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove Supabase — migration to AWS complete"
```

---

## Phase 4: Integration Testing

---

### Task 25: End-to-End Verification

**Files:** None (verification steps only)

- [ ] **Step 1: Start dev server**

```bash
cd /Users/rahul/Desktop/Expo/GCCP && npm run dev
# Open http://localhost:3000
```

- [ ] **Step 2: Test auth flow**

```
1. Navigate to http://localhost:3000/editor
   → Should redirect to /login (middleware working)

2. Click "Sign in with Google"
   → Should redirect to Google OAuth screen

3. Complete Google sign-in
   → Should redirect to /auth/callback, then /editor

4. Check browser localStorage:
   DevTools → Application → Local Storage → http://localhost:3000
   → Should see: gccp_id_token, gccp_refresh_token

5. Check cookies:
   DevTools → Application → Cookies
   → Should see: gccp-auth=1
```

- [ ] **Step 3: Test generation streaming**

```
1. In the editor, enter a topic and subtopics
2. Click "Generate"
3. Watch the generation progress UI:
   → Every agent should show its status in real-time
   → "Creator", "Analyzer", "Sanitizer" etc. should each appear as they run
   → Content should stream in as chunks
   → Final content should appear when complete

4. Open browser DevTools → Network tab
   → Find the /generate request
   → Verify it stays open while streaming (not a single JSON response)
   → Each line of NDJSON should arrive incrementally
```

- [ ] **Step 4: Verify DynamoDB storage**

Tell the user:

```
Go to: AWS Console → DynamoDB → Tables → gccp-generations → Explore items

After a generation completes, you should see a row with:
- userId: (your Cognito sub)
- generationId: GEN#...
- status: completed
- topic: (what you entered)
- finalContent or finalContentS3Key
```

- [ ] **Step 5: Test history across sessions**

```
1. Complete a generation
2. Open a new browser tab → go to http://localhost:3000/archives
3. Scroll down to "All Past Generations"
   → Should show your completed generation from step 1

4. Open an incognito window → go to /login → sign in with same Google account
   → Go to /archives → history should still show your past generations
   (proving cross-device persistence works)
```

- [ ] **Step 6: Test stop generation**

```
1. Start a generation
2. Click the stop button mid-generation
3. Verify: generation stops, UI shows stopped state
4. Verify: DynamoDB status is "failed" or "processing" (not "completed")
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: AWS migration complete — Cognito auth + Lambda streaming + DynamoDB history"
```

---

## Appendix: Values to Collect from User

Before starting Phase 3, have these values ready (all obtained during Phase 1):

| Variable | Where to find in AWS Console |
|---|---|
| `COGNITO_USER_POOL_ID` | Cognito → User pools → gccp-user-pool → Pool overview |
| `COGNITO_CLIENT_ID` | Cognito → User pools → App integration → App clients → gccp-web-app |
| `COGNITO_DOMAIN` | Cognito → User pools → App integration → Domain |
| `LAMBDA_URL` | Lambda → gccp-generation-api → Configuration → Function URL |
| `S3_BUCKET` | S3 → Bucket name you created |

## Appendix: Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| 401 from Lambda | Token expired or wrong header format | Check `Authorization: Bearer <token>` format; try refreshing page |
| CORS error in browser | Origin not in ALLOWED_ORIGINS | Add your origin to Lambda env var ALLOWED_ORIGINS and redeploy |
| Google sign-in redirect error | Callback URL mismatch | Verify Cognito App Client callback URL matches `window.location.origin/auth/callback` |
| Lambda timeout | Generation takes >15 min | Shouldn't happen for <10 users; check which agent is hanging |
| DynamoDB no items | Lambda can't write to DynamoDB | Check IAM role has DynamoDB permissions; check Lambda logs in CloudWatch |
| `performance` not defined | Missing import | Ensure `import { performance } from 'perf_hooks'` is in lambda/agents/orchestrator.ts |
