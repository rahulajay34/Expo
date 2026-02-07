# GCCP Technical Documentation (v5.0 "Deep Cosmos")

> **Version**: 5.0.0
> **Last Updated**: February 2026
> **Est. Reading Time**: 45 minutes
> **Status**: Production Stable

---

# 1. Executive Summary

GCCP (Generative Course Content Platform) is an advanced educational content generation system that orchestrates a Council of 11 AI Agents to autonomously transform high-level topic requests and raw lectures into university-grade course materials.

Unlike simple "wrapper" applications that pass prompts directly to an LLM, GCCP implements a **Stateful Multi-Agent Cognitive Architecture**. It treats content generation not as a single task, but as a complex pipeline of distinct cognitive phases: _Analysis_, _Creation_, _Sanitization_, _Verification_, and _Refinement_.

## 1.1 Core Value Proposition

1.  **Autonomous Cognition**: The system doesn't just "write"; it critiques, fact-checks, and refines its own work through adversarial agent loops.
2.  **Pedagogical Alignment**: Built-in "Course Detector" agents automatically adapt tone, structure, and examples to specific domains (e.g., Computer Science vs. Philosophy).
3.  **Deep Cosmos Experience**: A proprietary design system offering a cinematic, high-performance interface for content creation and auditing.
4.  **Hybrid Architecture**: Combines the determinism of directed graphs (Orchestrator) with the creativity of probabilistic LLMs (Agents).

## 1.2 System Context

```mermaid
graph TD
    User((User)) -->|Topic + Config| Frontend[Next.js Frontend]
    Frontend -->|Job Request| API[Next.js API Routes]
    API -->|Queue| Orchestrator[Agent Orchestrator (Server)]

    subgraph "The Council (Agent Swarm)"
        Orchestrator -->|Course Context| Detector[Course Detector]
        Orchestrator -->|Gap Analysis| Analyzer[Analyzer Agent]
        Orchestrator -->|Drafting| Creator[Creator Agent]
        Orchestrator -->|Fact Check| Sanitizer[Sanitizer Agent]
        Orchestrator -->|Quality Control| Reviewer[Reviewer Agent]
        Reviewer <-->|Feedback Loop| Refiner[Refiner Agent]
        Orchestrator -->|Final Polish| Formatter[Formatter Agent]
    end

    Orchestrator -->|Persistence| DB[(Supabase DB)]
    Frontend <-->|Real-time Updates| DB

    Creator -.->|LLM Calls| Gemini[Google Gemini 1.5 Pro]
    Sanitizer -.->|LLM Calls| GeminiFlash[Google Gemini 1.5 Flash]
```

---

# 2. System Architecture

The application is built on the **T3 Stack** principles but significantly extended for agentic workloads.

## 2.1 The "Production Hybrid" Pattern

We utilize a pattern we call **Production Hybrid**, which separates the user interface from the heavy cognitive lifting:

- **The "Lobby" (Client)**: A lightweight, responsive UI built with React 19 and Framer Motion. It handles configuration, real-time status visualization, and final rendering. It _never_ processes AI logic directly.
- **The "Engine" (Server)**: A robust Node.js/Next.js server runtime that manages the long-running, resource-intensive agent chains. It handles state persistence, error recovery, and API rate limiting.

## 2.2 Technology Stack

| Layer          | Technology                    | Purpose                                              |
| :------------- | :---------------------------- | :--------------------------------------------------- |
| **Frontend**   | **Next.js 14** (App Router)   | React Server Components, Streaming SSR               |
| **UI Library** | **React 19**, **TailwindCSS** | Component lifecycle, styling engine                  |
| **State**      | **Zustand** + **Immer**       | Global client state, complex object updates          |
| **Database**   | **Supabase** (PostgreSQL)     | Relational data, Vector Store, Auth                  |
| **AI Runtime** | **Google Gemini SDK**         | `@google/generative-ai` for specialized model access |
| **Monitoring** | **Sentry** (Optional)         | Error tracking and performance paths                 |
| **Diagrams**   | **Mermaid.js**                | Dynamic flowchart and sequence generation            |
| **Math**       | **KaTeX**                     | Fast, reliable LaTeX math rendering updates          |

## 2.3 Directory Structure Map

A detailed map of the critical directories in the `src/` folder:

```text
src/
├── app/                  # Next.js App Router (File-system routing)
│   ├── api/              # Serverless API routes (Edge/Node)
│   │   ├── jobs/         # Generation job submission endpoints
│   │   └── stream/       # Server-Side Event (SSE) streaming
│   ├── editor/           # Main "Deep Cosmos" workspace
│   │   └── page.tsx      # The monolithic editor view
│   └── globals.css       # Tailwind & Design System tokens
├── components/           # Reusable UI Components
│   ├── editor/           # Editor-specific widgets (GapAnalysis, Stepper)
│   ├── ui/               # "Deep Cosmos" primitives (GlassCard, GlowingButton)
│   └── providers/        # Context providers (Theme, Auth, Toast)
├── lib/                  # Core Business Logic & Utilities
│   ├── agents/           # THE COUNCIL: Agent class implementations
│   │   ├── base-agent.ts # Abstract base class for all agents
│   │   ├── orchestrator.ts # Main state machine & pipeline logic
│   │   └── [agent].ts    # Individual agent specializations
│   ├── gemini/           # AI Provider Abstraction
│   │   └── client.ts     # Unified Gemini Client (Stream/Unary)
│   ├── store/            # State Management
│   │   └── generation.ts # Zustand store for active session
│   └── supabase/         # Database Clients
├── prompts/              # Prompt Engineering Library
│   ├── creator/          # Complex System Prompts for content generation
│   └── [agent]/          # Specialized prompts for other agents
└── types/                # TypeScript Interfaces
    └── content.ts        # Core data models (CourseContext, Logs, etc.)
```

---

# 3. The Agentic Core (The Council)

The heart of GCCP is **The Council**—a set of specialized AI agents, each with a distinct "personality," narrow responsibility, and specific model configuration. They do not share memory directly; they communicate via the **Orchestrator**, which acts as the central bus.

## 3.1 Base Agent Architecture

All agents extend the `BaseAgent` abstract class (`src/lib/agents/base-agent.ts`). This ensures consistent behavior for:

1.  **Model Instantiation**: Automatically selecting the correct model tier (Flash vs. Pro).
2.  **Telemetry**: Standardized logging of inputs, outputs, and token usage.
3.  **Error Handling**: Unified retry logic and fallback mechanisms.

```typescript
// Conceptual BaseAgent Structure
abstract class BaseAgent {
  constructor(name: string, model: string, client: GeminiClient) {}

  abstract getSystemPrompt(): string;

  async generate(params: any): Promise<any> {
    // 1. Prepare context
    // 2. Call LLM with retries
    // 3. Parse and validate output
    // 4. Return structured result
  }
}
```

## 3.2 The Orchestrator (`orchestrator.ts`)

The **Orchestrator** is the "Manager" agent. It does not generate content itself; it manages the pipeline.

**Responsibilities:**

- **Workflow Management**: Decides which agent runs next based on current state.
- **State Aggregation**: Collects outputs from agents (e.g., Course Context, Gap Analysis) and passes them to downstream agents.
- **Concurrency**: Manages parallel execution (e.g., running `Analyzer` and `InstructorQuality` simultaneously).
- **Safety**: Enforces "Human-in-the-loop" stops using `mismatch` states.

**The Pipeline Flow:**

1.  **Initialization**: User submits Topic + Subtopics + (Optional) Transcript.
2.  **Phase 1: Analysis (Parallel)**
    - **Course Detector**: Identify domain (e.g., "Physics") and tone.
    - **Analyzer**: Check transcript against requested subtopics for coverage.
    - **Instructor Quality**: Assess transcript teaching style.
3.  **Phase 2: Gating**
    - If `Analyzer` finds < 10% coverage, Orchestrator halts with `MISMATCH` error.
4.  **Phase 3: Creation**
    - **Creator Agent**: Generates the draft content (streaming).
5.  **Phase 4: Verification**
    - **Sanitizer**: Fact-checks draft against transcript.
6.  **Phase 5: Refinement Loop (The "Critique" Cycle)**
    - **Reviewer**: Scores content (0-10) and lists issues.
    - **Refiner**: Fixing issues if Score < 8.
    - _(Repeats max 3 times)_.
7.  **Phase 6: Finalization**
    - **Formatter**: Applies "Deep Cosmos" Markdown styling.
    - **Assignment Sanitizer**: (If Assignment mode) Validates JSON structure.

## 3.3 Agent Reference Guide

### 1. Course Detector Agent (`course-detector.ts`)

- **Role**: The "Academic Dean". Determines the subject matter expertise required.
- **Model**: `gemini-1.5-flash` (Fast, classification-focused).
- **Input**: Topic string, Subtopics string.
- **Output**: `CourseContext` object.
  - `domain`: e.g., "quantum-mechanics".
  - `characteristics`: Preferred example types, forbidden terminology.
  - `voiceModel`: Tone settings (e.g., "Rigorous Academic" vs. "Supportive Mentor").
- **Why it matters**: Prevents a History lecture from sounding like a Coding tutorial.

### 2. Analyzer Agent (`analyzer.ts`)

- **Role**: The "Curriculum Auditor".
- **Model**: `gemini-1.5-flash`.
- **Input**: Requested Subtopics, Transcript.
- **Output**: `GapAnalysisResult`.
  - `covered`: List of subtopics found in transcript.
  - `partiallyCovered`: Topics needing external supplementation (flagged).
  - `notCovered`: Topics completely missing.
- **Critical Feature**: Implements **Sequential Thinking** (Chain-of-Thought) to rigorously prove why a topic is considered "missing," reducing false negatives.

### 3. Creator Agent (`creator.ts`)

- **Role**: The "Professor". The primary author of the content.
- **Model**: `gemini-1.5-pro` (High creativity, large context window).
- **Input**: Topic, Subtopics, CourseContext, Transcript, GapAnalysis.
- **Output**: Raw Markdown (Streamed).
- **Key Behavior**:
  - Injects `CourseContext` guidelines into the system prompt at runtime.
  - Uses "Anti-Duplication" constraints to prevent repeating concepts.
  - Strictly prioritizes Transcript content over general knowledge if provided.

### 4. Sanitizer Agent (`sanitizer.ts`)

- **Role**: The "Editor & Fact Checker".
- **Model**: `gemini-1.5-flash`.
- **Input**: Generated Draft, Original Transcript.
- **Output**: Cleaned Markdown.
- **Logic**:
  - Performs a "Single Pass" rewrite.
  - Verifies every claim against the transcript.
  - **Domain Consistency**: Removes hallucinations that don't fit the `CourseContext` (e.g., biology terms in a CS lecture).
  - **Hallucination Removal**: If a claim isn't in the transcript and wasn't requested, it is purged.

### 5. Reviewer Agent (`reviewer.ts`)

- **Role**: The "Quality Assurance Lead".
- **Model**: `gemini-1.5-pro`.
- **Input**: Current Draft.
- **Output**: JSON Assessment.
  - `score`: 0-10 integer.
  - `feedback`: List of specific, actionable improvements (e.g., "Section 2 is too vague", "Missing code example for loop").
  - `threshold`: Defaults to 8/10.

### 6. Refiner Agent (`refiner.ts`)

- **Role**: The "Revisionist".
- **Model**: `gemini-1.5-pro`.
- **Input**: Current Draft, Reviewer's Feedback.
- **Output**: Improved Markdown.
- **Behavior**: Takes specific feedback items and applies them surgically to the text. It does _not_ rewrite the whole document if not needed, but often acts as a second drafter.

### 7. Formatter Agent (`formatter.ts`)

- **Role**: The "Typesetter".
- **Model**: `gemini-1.5-flash`.
- **Input**: Final Text.
- **Output**: Polished Markdown.
- **Tasks**:
  - Standardizes header levels (H1 -> H2 -> H3).
  - Formats code blocks with correct language tags.
  - Ensures consistent spacing and bullet point styles.
  - Injects "Deep Cosmos" UI hints (e.g., specific blockquote styles).

### 8. Introduction Agent (`introduction.ts`)

- **Role**: The "Hook Writer".
- **Model**: `gemini-1.5-pro`.
- **Purpose**: Crafts a compelling, 1-paragraph overview that sits at the top of the content. It runs _after_ the main content is generated to ensure it accurately summarizes what was actually written.

### 9. Assignment Generator (`assignment.ts`)

- **Role**: The "Exam Proctor".
- **Model**: `gemini-1.5-pro`.
- **Input**: Topic, Subtopics, Transcript.
- **Mode**: Only active when User selects "Assignment" mode.
- **Output**: Complex JSON structure containing:
  - `mcsc`: Multiple Choice Single Correct questions.
  - `mcmc`: Multiple Choice Multiple Correct questions.
  - `subjective`: Open-ended scenario questions.
- **Constraint**: Must output valid JSON. Often followed by `AssignmentSanitizer` to fix syntax errors.

### 10. Assignment Sanitizer (`assignment-sanitizer.ts`)

- **Role**: The "JSON Validator".
- **Model**: `gemini-1.5-flash` (JSON mode).
- **Input**: Potentially malformed JSON from Assignment Generator.
- **Output**: Validated, parsed JSON object.
- **Logic**: Uses a repair loop to fix common LLM JSON errors (trailing commas, unescaped quotes).

### 11. Meta-Quality Agent (`meta-quality.ts`)

- **Role**: The "Post-Mortem Analyst".
- **Model**: `gemini-1.5-pro`.
- **Trigger**: Manual trigger by Admin via Archive view.
- **Input**: The entire generation artifacts + User Feedback (if any).
- **Output**: `MetaAnalysis` report.
- **Purpose**: Analyzes the quality of ANY generation (User or Admin). Provides insights on agent performance, "hallucination rate", and "instruction coherence". This data allows system administrators to tune the prompts of other agents.

---

# 4. Database Schema (Supabase)

The application uses a relational schema on PostgreSQL (via Supabase). The schema is designed for:
1.  **Strict Referencing**: `CASCADE` deletes ensure no orphaned data.
2.  **Row Level Security (RLS)**: Users can only see their own data.
3.  **Real-time capabilities**: The `generations` table broadcasts changes to the frontend.

## 4.1 Core Tables

### `profiles`
*   **Purpose**: Extends the default Supabase `auth.users` table with application-specific data.
*   **Columns**:
    *   `id` (UUID, PK): References `auth.users(id)`.
    *   `email` (Text): Synced from Auth.
    *   `role` (Enum): `'user'` or `'admin'`.
    *   `credits` (Int): Consumption tracking (default 100).

### `generations`
*   **Purpose**: The central entity representing a content creation job.
*   **Columns**:
    *   `id` (UUID, PK): Unique job ID.
    *   `user_id` (UUID, FK): Owner.
    *   `topic` (Text): The main subject.
    *   `subtopics` (Text): Detail scope.
    *   `mode` (Enum): `'lecture'`, `'pre-read'`, `'assignment'`.
    *   `status` (Enum): `'queued'`, `'processing'`, `'completed'`, `'failed'`, `'mismatch'`.
    *   `current_step` (Int): Progress tracking (0-100).
    *   `transcript` (Text): Optional source material.
    *   `final_content` (Text): The Markdown output.
    *   `gap_analysis` (JSONB): Output from Analyzer agent.
    *   `course_context` (JSONB): Output from Course Detector.
    *   `estimated_cost` (Decimal): Cost in USD (calculated from token usage).

### `generation_logs`
*   **Purpose**: An append-only log of every agent action, used for the "Terminal" view in the UI.
*   **Columns**:
    *   `generation_id` (UUID, FK).
    *   `agent_name` (Text): e.g., "Creator".
    *   `message` (Text): "Drafting section 1...".
    *   `log_type` (Enum): `'info'`, `'error'`, `'success'`, `'step'`.

### `checkpoints`
*   **Purpose**: Stores snapshots of content at various stages for recovery or history.
*   **Columns**:
    *   `generation_id` (UUID, FK).
    *   `step_name` (Text): e.g., "post-creation".
    *   `content_snapshot` (Text).

## 4.2 Row Level Security (RLS) Policies

Security is enforced at the database layer, not just the API layer.

*   **Profiles**:
    *   `SELECT`: Users view own; Admins view all.
    *   `UPDATE`: Users update own; Admins update all.
*   **Generations**:
    *   `SELECT`: Users view own; Admins view all.
    *   `INSERT`: Users insert with their own `user_id`.
    *   `DELETE`: Users delete own.
*   **Realtime**:
    *   `supa_realtime` publication allows the frontend to subscribe to `generations` and `generation_logs` filtered by `user_id`.

---

# 5. Frontend & Mechanics

The frontend is a "Thin Client" that delegates complex logic to the server but handles rich visualization and interactivity.

## 5.1 The "Deep Cosmos" Design System

The application implements a bespoke design system defined in `tailwind.config.ts` and `globals.css`.

*   **Color Palette**: a "Deep Space" theme using Slate/Zinc (900-950) for backgrounds and vibrant "Aurora" gradients (Blue/Violet/Fujimaru/Emerald) for accents.
*   **Glassmorphism**: Heavily uses `backdrop-blur`, `bg-white/5` and `border-white/10` to create depth.
*   **Typography**: `Inter` (Sans) for UI, `JetBrains Mono` for code/logs.

## 5.2 Key Components

### `Editor Content` (`src/app/editor/page.tsx`)
The monolithic orchestrator of the frontend experience.
*   **State**: Uses `useGeneration` hook to sync with Zustand store and Supabase Realtime.
*   **Layout**:
    *   **Sidebar**: Configuration.
    *   **Main**: Split view (Editor vs. Preview).
    *   **Terminal**: Real-time logs from `generation_logs`.

### `SafeMarkdown` (`src/components/ui/SafeMarkdown.tsx`)
A hardened Markdown renderer based on `react-markdown`.
*   **Security**: Sanitizes HTML to prevent XSS.
*   **Features**:
    *   **Mathematical Rendering**: Uses `rehype-katex` to render LaTeX equations ($...$).
    *   **Mermaid Diagrams**: Custom plugin to render code blocks marked as `mermaid`.
    *   **Syntax Highlighting**: `rehype-highlight` for code blocks.

### `GenerationStepper` (`src/components/editor/GenerationStepper.tsx`)
Visualizes the pipeline progress.
*   Maps raw backend status (`processing`) to granular "Steps" (e.g., "Analyzing context", "Drafting content").
*   Uses `framer-motion` for smooth layout transitions.

## 5.3 State Management (`useGenerationStore`)

We use **Zustand** for global client state.
*   **Persistence**: Uses `persist` middleware to save draft state to `localStorage` (key: `generation-storage`).
*   **Throttling**: The `updateContent` action is throttled to preventing React render trashing during high-speed streaming.

---

# 6. API Reference

All API routes are located in `src/app/api/`. They are secured using Supabase Auth helpers.

## 6.1 `POST /api/jobs`

Submits a new generation request.
*   **Auth**: Required.
*   **Body**: `{ topic, subtopics, mode, transcript }`.
*   **Behavior**:
    1.  Validates input.
    2.  Creates a `generations` record in DB (Status: `queued`).
    3.  **Spawns a background worker** (does NOT wait for completion).
    4.  Returns `{ jobId, status: 'queued' }` immediately.

## 6.2 `GET /api/stream` (SSE)

Used for direct LLM streaming (bypassing the DB for ephemeral checks).
*   **Auth**: Required.
*   **Method**: Server-Sent Events.
*   **Usage**: Used by `CreatorAgent` internally (server-to-server) or for lightweight client-side checks.

---

# 7. Operational & Security

## 7.1 Environment Variables

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key (safe for browser). |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET**. Admin key for background workers. |
| `GEMINI_API_KEY` | **SECRET**. Google AI Studio key. |

## 7.2 Deployment Strategy

The app is designed for **Vercel**.
*   **Build Command**: `next build`.
*   **Output Directory**: `.next`.
*   **Edge Functions**: API routes are compatible with Edge runtime (though currently using Node.js for broad library support).

## 7.3 Data Privacy

*   **Transcript Retention**: Transcripts are stored in the `generations` table.
*   **LLM Privacy**: Data sent to Google Gemini is governed by Google's Cloud terms (GCCP does not use user data for model training).
*   **Isolation**: RLS ensures strict user data isolation.

---
