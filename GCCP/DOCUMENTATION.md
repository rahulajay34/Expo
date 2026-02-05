# GCCP - Educational Content Generation Platform

## Comprehensive Technical Documentation

**Document Version:** 3.0  
**Last Updated:** February 5, 2026  
**System Type:** Multi-Agent AI Content Generation SaaS Platform  
**Classification:** Internal Technical Reference

**Current AI Provider:** Google Gemini (via @google/generative-ai SDK)  
**Migration Notes:** Migrated from xAI Grok to Google Gemini. Multi-model strategy with Pro and Flash variants. Backward compatibility maintained via client wrapper.

---

## Key Changes in Version 3.0 (February 5, 2026)

### Major Updates

| Category                   | Change                                                                   | Impact                                                               |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **AI Provider**            | Migrated from xAI Grok to Google Gemini                                  | Multi-model strategy: Pro for complex tasks, Flash for simpler tasks |
| **API Integration**        | Switched to @google/generative-ai SDK                                    | Native Gemini API support with streaming                             |
| **Client Wrapper**         | New `GeminiClient` class in `lib/gemini/`                                | Automatic proxy detection, retry logic, streaming support            |
| **Model Strategy**         | Smart model selection                                                    | Pro for Creator/Refiner, Flash for Analyzer/Reviewer/etc.            |
| **Backward Compatibility** | `lib/xai/client.ts` and `lib/anthropic/client.ts` re-export GeminiClient | Existing code works without changes                                  |
| **Prompt Enhancement**     | Reduced visual clutter in generated content                              | Clean Markdown formatting instead of heavy HTML                      |
| **Image Generation**       | Added image generation service                                           | Ready for integration in pre-read/notes workflows                    |

### Configuration Changes

**Environment Variables:**

- **New:** `GEMINI_API_KEY` - Google Gemini API key (server-side)
- **Deprecated:** `XAI_API_KEY` - Legacy xAI Grok key (no longer needed)

**Pricing Update (Gemini Flash as baseline):**

- Input: $0.15 per million tokens
- Output: $0.60 per million tokens
- Pro model has higher rates for complex tasks

### Model Selection Strategy

| Agent                      | Model                            | Rationale                  |
| -------------------------- | -------------------------------- | -------------------------- |
| `CreatorAgent`             | `gemini-2.5-pro-preview-05-06`   | Complex content generation |
| `RefinerAgent`             | `gemini-2.5-pro-preview-05-06`   | Complex content refinement |
| `AnalyzerAgent`            | `gemini-2.5-flash-preview-04-17` | Simpler analysis tasks     |
| `CourseDetectorAgent`      | `gemini-2.5-flash-preview-04-17` | Classification task        |
| `SanitizerAgent`           | `gemini-2.5-flash-preview-04-17` | Verification task          |
| `ReviewerAgent`            | `gemini-2.5-flash-preview-04-17` | Evaluation task            |
| `FormatterAgent`           | `gemini-2.5-flash-preview-04-17` | Formatting task            |
| `AssignmentSanitizerAgent` | `gemini-2.5-flash-preview-04-17` | Validation task            |

### Files Added/Modified

| File                                           | Status   | Purpose                                           |
| ---------------------------------------------- | -------- | ------------------------------------------------- |
| `lib/gemini/client.ts`                         | New      | Google Gemini API client wrapper                  |
| `lib/gemini/token-counter.ts`                  | New      | Token estimation and Gemini pricing               |
| `lib/gemini/image-service.ts`                  | New      | Image generation service (for future integration) |
| `lib/xai/client.ts`                            | Modified | Now re-exports GeminiClient                       |
| `lib/anthropic/client.ts`                      | Modified | Now re-exports GeminiClient                       |
| `app/api/stream/route.ts`                      | Modified | Uses Gemini API for streaming                     |
| `app/api/generate/route.ts`                    | Modified | Uses Gemini for inline processing                 |
| `app/api/retry/route.ts`                       | Modified | Uses Gemini for inline processing                 |
| `supabase/functions/generate-content/index.ts` | Modified | Uses Gemini API                                   |
| `prompts/creator/index.ts`                     | Modified | Reduced HTML styling, clean Markdown              |

---

# Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Repository Map](#2-repository-map-complete-file--folder-index)
3. [Technology Stack Breakdown](#3-technology-stack-breakdown)
4. [Application Architecture](#4-application-architecture)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
6. [Backend / Server Deep Dive](#6-backend--server-deep-dive)
7. [API & Data Contracts](#7-api--data-contracts)
8. [Database & Data Model](#8-database--data-model)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [End-to-End Application Workflow](#10-end-to-end-application-workflow)
11. [Feature Inventory](#11-feature-inventory)
12. [Configuration & Environment Management](#12-configuration--environment-management)
13. [Build, Run, and Deployment](#13-build-run-and-deployment)
14. [Observability & Error Handling](#14-observability--error-handling)
15. [Code Quality & Maintainability Review](#15-code-quality--maintainability-review)
16. [Performance Considerations](#16-performance-considerations)
17. [Security Analysis](#17-security-analysis)
18. [Known Flaws, Risks & Technical Debt](#18-known-flaws-risks--technical-debt)
19. [Missing Pieces & Assumptions](#19-missing-pieces--assumptions)
20. [Future Improvement Opportunities](#20-future-improvement-opportunities)
21. [Appendix](#21-appendix)

---

# 1. Executive Overview

## 1.1 What This Application Is

GCCP (Educational Content Generation Platform, internally named "temp-app" in package.json) is a **multi-agent AI-powered educational content generation system** that automates the creation of lecture notes, assignments, and pre-reading materials using a sophisticated 7-agent orchestration pipeline powered by xAI's Grok models (via OpenAI-compatible API).

The system functions as an **internal SaaS tool** designed for educational content creators, instructional designers, and educators who need to rapidly produce high-quality, curriculum-aligned educational materials from topic outlines and optional transcript inputs.

## 1.2 Who It Is For

| User Type                   | Use Case                                                        |
| --------------------------- | --------------------------------------------------------------- |
| **Instructional Designers** | Creating comprehensive lecture notes from course outlines       |
| **Educators/Professors**    | Generating assignments (MCQ, MCMC, subjective) with answer keys |
| **Content Developers**      | Producing pre-reading materials to prepare students             |
| **Course Administrators**   | Managing user budgets and reviewing generated content           |

## 1.3 Problem Statement

Traditional educational content creation is:

- **Time-intensive**: Hours to create well-structured lecture notes
- **Inconsistent**: Quality varies significantly between authors
- **Difficult to scale**: Creating multiple content types for each topic requires repetitive effort
- **Misaligned**: Content often doesn't properly map to specific learning objectives

GCCP solves these problems through:

- Automated content generation (average ~6 minutes per piece)
- Consistent quality through multi-agent review and refinement loops
- Support for three content types from a single topic/subtopic specification
- Gap analysis against transcripts to ensure content alignment

## 1.4 System Type Classification

| Aspect           | Classification                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| Architecture     | **Full-stack Next.js 16 application** with server-side API routes       |
| Deployment Model | **SaaS-ready** (designed for Vercel/similar platforms)                  |
| Data Model       | **Multi-tenant** with user isolation via Row Level Security             |
| AI Integration   | **Multi-agent agentic AI system** with streaming responses via xAI Grok |
| State Management | **Hybrid** (Zustand client-side + Supabase server-side)                 |

## 1.5 High-Level System Philosophy (Inferred)

The codebase reflects several key architectural philosophies:

1. **Agent-Based AI Architecture**: Following the "Agentic AI Framework" pattern with specialized agents for specific tasks (detection, analysis, creation, sanitization, review, refinement, formatting).

2. **Quality Over Speed**: The multi-agent pipeline with review/refine loops prioritizes output quality over generation speed—content passes through up to 7 agents with iterative refinement.

3. **Cost Awareness**: Explicit cost tracking per generation, budget management per user, and architectural decisions for cost optimization (semantic caching, model routing recommendations in `AGENTIC_ENHANCEMENTS.md`).

4. **Fail-Safe Defaults**: Conservative error handling, fallbacks at multiple levels, and defensive coding patterns throughout.

5. **Progressive Enhancement**: Basic functionality works without all features; optional transcript analysis, optional refinement loops, caching benefits accumulate over time.

---

# 2. Repository Map (Complete File & Folder Index)

## 2.1 Top-Level Structure

```
/Users/rahul/Desktop/Expo/
├── Notes.md                    # Educational notes about RAG (unrelated to app)
├── package.json                # Workspace package.json (empty/minimal)
├── GCCP/                       # Main application directory
│   ├── AGENTIC_ENHANCEMENTS.md # Architecture enhancement roadmap
│   ├── README.md               # Default Next.js README
│   ├── package.json            # Application dependencies
│   ├── next.config.ts          # Next.js configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── tailwind.config.ts      # Tailwind CSS configuration
│   ├── postcss.config.mjs      # PostCSS configuration
│   ├── eslint.config.mjs       # ESLint configuration
│   ├── next-env.d.ts           # Next.js type declarations
│   ├── public/                 # Static assets (empty)
│   ├── src/                    # Application source code
│   └── supabase/               # Supabase project configuration
└── supabase/                   # Root Supabase migrations (duplicate)
    └── migrations/
```

## 2.2 Source Directory Structure (`src/`)

```
src/
├── middleware.ts               # Next.js middleware for session refresh
├── app/                        # Next.js App Router pages
│   ├── globals.css             # Global styles (Tailwind base)
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing/dashboard page
│   ├── api/                    # API routes (server-side)
│   │   ├── admin/reset-credits/# Admin: reset user credits
│   │   ├── debug/profile/      # Debug: profile inspection
│   │   ├── debug/supabase/     # Debug: Supabase connection
│   │   ├── generate/route.ts   # POST: Create generation (DB record)
│   │   ├── retry/route.ts      # POST: Retry failed generation
│   │   └── stream/route.ts     # POST/PUT: xAI Grok API proxy
│   ├── archives/page.tsx       # View saved generations
│   ├── auth/callback/          # OAuth callback handler
│   ├── editor/page.tsx         # Main content editor/generator
│   ├── login/page.tsx          # Login page
│   └── users/page.tsx          # Admin: user management
├── components/                 # React components
│   ├── ErrorBoundary.tsx       # Error boundary wrapper
│   ├── NavigationProgress.tsx  # Page transition loading indicator
│   ├── providers.tsx           # Provider composition
│   ├── auth/AuthGuard.tsx      # Route protection component
│   ├── editor/                 # Editor-specific components
│   │   ├── AssignmentWorkspace.tsx # Assignment JSON editor
│   │   ├── GapAnalysis.tsx     # Gap analysis display
│   │   ├── GenerationStepper.tsx # Progress visualization
│   │   └── MetricsDashboard.tsx# Cost/performance metrics
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx          # App header with budget display
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── SidebarContext.tsx  # Sidebar state management
│   ├── providers/ThemeProvider.tsx # Theme context
│   └── ui/                     # UI primitives
│       ├── Mermaid.tsx         # Mermaid diagram renderer
│       └── SafeMarkdown.tsx    # XSS-safe markdown renderer
├── hooks/                      # Custom React hooks
│   ├── index.ts                # Hook exports
│   ├── useAuth.tsx             # Authentication hook + context
│   └── useGeneration.ts        # Generation orchestration hook
├── lib/                        # Core libraries
│   ├── agents/                 # AI agent implementations
│   │   ├── base-agent.ts       # Abstract base agent class
│   │   ├── orchestrator.ts     # Multi-agent pipeline orchestrator
│   │   ├── analyzer.ts         # Gap analysis agent
│   │   ├── assignment-sanitizer.ts # Assignment validation agent
│   │   ├── course-detector.ts  # Domain detection agent
│   │   ├── creator.ts          # Content creation agent
│   │   ├── formatter.ts        # JSON formatting agent
│   │   ├── refiner.ts          # Content refinement agent
│   │   ├── reviewer.ts         # Quality review agent
│   │   ├── sanitizer.ts        # Fact-checking agent
│   │   └── utils/              # Agent utilities
│   │       ├── content-sanitizer.ts # Content cleanup
│   │       ├── json-parser.ts  # LLM JSON parsing
│   │       └── text-diff.ts    # Search/replace patch application
│   ├── anthropic/              # Legacy wrapper (re-exports XAIClient)
│   │   ├── client.ts           # API client with retry logic
│   │   └── token-counter.ts    # Token estimation & pricing
│   ├── exporters/pdf.ts        # PDF export via print dialog
│   ├── storage/persistence.ts  # Supabase persistence with retry
│   ├── store/generation.ts     # Zustand store for generation state
│   ├── supabase/               # Supabase client configuration
│   │   ├── client.ts           # Browser client
│   │   ├── middleware.ts       # Session refresh middleware
│   │   └── server.ts           # Server client + service role
│   └── utils/                  # Utility modules
│       ├── cache.ts            # In-memory caching
│       ├── context-manager.ts  # Context pruning for LLM
│       ├── env-logger.ts       # Environment-aware logging
│       ├── logger.ts           # Structured logging
│       ├── quality-gate.ts     # Output validation
│       ├── semantic-cache.ts   # Embedding-based caching
│       └── subtopic-normalizer.ts # Input normalization
├── prompts/                    # LLM prompt templates
│   └── creator/index.ts        # Creator agent prompts (1100+ lines)
└── types/                      # TypeScript type definitions
    ├── assignment.ts           # Assignment data model + CSV
    ├── content.ts              # Content types & generation state
    └── database.ts             # Supabase schema types
```

## 2.3 Supabase Directory Structure

```
supabase/
├── config.toml                 # Supabase local development config
├── fix_profiles.sql            # Profile repair script
├── fix_profiles_v2.sql         # Profile repair script v2
├── functions/                  # Edge Functions (planned)
│   └── generate-content/index.ts # Background generation (incomplete)
└── migrations/                 # Database migrations
    ├── 20260127000000_initial_schema.sql
    ├── 20260127000001_add_profile_insert_policy.sql
    ├── 20260202000000_recreate_full_schema.sql  # Full schema recreation
    ├── 20260202000001_add_admin_update_policy.sql
    ├── 20260203000000_semantic_cache.sql
    └── 20260203000001_add_spent_credits.sql     # Persistent budget tracking
```

## 2.4 Directory Purpose Summary

| Directory              | Purpose                                 | Key Files                                            |
| ---------------------- | --------------------------------------- | ---------------------------------------------------- |
| `src/app/`             | Next.js App Router pages and API routes | `page.tsx`, `editor/page.tsx`, `api/stream/route.ts` |
| `src/components/`      | Reusable React components               | `SafeMarkdown.tsx`, `AuthGuard.tsx`                  |
| `src/lib/agents/`      | AI agent implementations                | `orchestrator.ts`, `creator.ts`, `reviewer.ts`       |
| `src/lib/anthropic/`   | Legacy wrapper for compatibility        | `client.ts` (re-exports)                             |
| `src/lib/supabase/`    | Supabase client configuration           | `client.ts`, `server.ts`, `middleware.ts`            |
| `src/lib/utils/`       | Utility functions                       | `cache.ts`, `quality-gate.ts`                        |
| `src/prompts/`         | LLM system prompts                      | `creator/index.ts`                                   |
| `src/types/`           | TypeScript type definitions             | `database.ts`, `content.ts`, `assignment.ts`         |
| `supabase/migrations/` | Database schema migrations              | `20260202000000_recreate_full_schema.sql`            |

---

# 3. Technology Stack Breakdown

## 3.1 Frontend Stack

| Technology         | Version  | Purpose                                    |
| ------------------ | -------- | ------------------------------------------ |
| **React**          | 19.2.3   | UI component library                       |
| **Next.js**        | 16.1.4   | Full-stack React framework with App Router |
| **TypeScript**     | ^5       | Static typing                              |
| **Tailwind CSS**   | ^3.4.17  | Utility-first CSS framework                |
| **Zustand**        | ^5.0.10  | Client-side state management               |
| **TanStack Query** | ^5.90.19 | Server state management (minimal use)      |

### Frontend Libraries

| Library                   | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `openai`                  | OpenAI SDK for xAI Grok API integration                       |
| `react-markdown`          | Markdown rendering                                            |
| `rehype-*`                | Markdown processing plugins (highlight, katex, raw, sanitize) |
| `remark-*`                | Markdown parsing plugins (gfm, math, breaks)                  |
| `katex` + `react-katex`   | LaTeX math rendering                                          |
| `mermaid`                 | Diagram rendering                                             |
| `highlight.js`            | Code syntax highlighting                                      |
| `@monaco-editor/react`    | In-browser code editor                                        |
| `lucide-react`            | Icon library                                                  |
| `clsx` + `tailwind-merge` | Conditional class utilities                                   |
| `lodash`                  | Utility functions (debounce)                                  |
| `dexie`                   | IndexedDB wrapper (installed but not actively used)           |

## 3.2 Backend Stack

| Technology             | Purpose                               |
| ---------------------- | ------------------------------------- |
| **Next.js API Routes** | Server-side API endpoints             |
| **Supabase**           | PostgreSQL database + authentication  |
| **xAI Grok**           | AI model integration (via OpenAI SDK) |

### Backend Libraries

| Library  | Purpose                                 |
| -------- | --------------------------------------- |
| `openai` | OpenAI SDK for xAI Grok API integration |

## 3.3 Database Layer

| Component      | Details                                       |
| -------------- | --------------------------------------------- |
| **Database**   | PostgreSQL (via Supabase)                     |
| **ORM**        | None (raw Supabase client queries)            |
| **Migrations** | SQL migration files in `supabase/migrations/` |
| **Extensions** | `uuid-ossp` for UUID generation               |

### XAIClient Wrapper

The application uses a custom `XAIClient` wrapper class that interfaces with xAI's Grok API via the OpenAI SDK:

**Key Features:**

- **Automatic proxy detection**: Uses secure server-side proxy on client, direct API calls on server
- **Retry logic**: Exponential backoff for rate limits (429) and server errors (5xx)
- **OpenAI compatibility**: Uses OpenAI SDK with `baseURL: 'https://api.x.ai/v1'`
- **Streaming support**: Both streaming (`stream()`) and non-streaming (`generate()`) methods
- **Abort handling**: Respects `AbortSignal` for cancellation

**Backward Compatibility:**

```typescript
// lib/anthropic/client.ts re-exports XAIClient
export { XAIClient as AnthropicClient } from "@/lib/xai/client";
```

This allows existing code using `AnthropicClient` to work without changes.

## 3.4 AI Integration Layer

| Component         | Details                                               |
| ----------------- | ----------------------------------------------------- |
| **Primary Model** | `grok-4-1-fast-reasoning-latest` (all agents)         |
| **API Provider**  | xAI (via OpenAI-compatible API)                       |
| **Streaming**     | Server-Sent Events (SSE) via API proxy                |
| **Retry Logic**   | Exponential backoff for rate limits and server errors |

### Model Usage by Agent

| Agent               | Model | Reasoning                             |
| ------------------- | ----- | ------------------------------------- |
| CourseDetector      | Grok  | Classification task                   |
| Analyzer            | Grok  | JSON extraction                       |
| Creator             | Grok  | Content generation (requires quality) |
| Sanitizer           | Grok  | Fact verification                     |
| Reviewer            | Grok  | Quality assessment                    |
| Refiner             | Grok  | Content improvement                   |
| Formatter           | Grok  | JSON formatting                       |
| AssignmentSanitizer | Grok  | Question validation                   |

```
┌──────────────────────────────────────────────────────────────┐
│                     State Management                          │
├──────────────────────────────────────────────────────────────┤
│  Client-Side (Zustand)                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ useGenerationStore:                                      │ │
│  │   - topic, subtopics, mode                              │ │
│  │   - transcript                                          │ │
│  │   - status, currentAgent, currentAction                 │ │
│  │   - finalContent, formattedContent                      │ │
│  │   - gapAnalysis                                         │ │
│  │   - logs[]                                              │ │
│  │   - estimatedCost                                       │ │
│  │   - assignmentCounts                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Server-Side (Supabase)                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ profiles: User accounts + credits                        │ │
│  │ generations: Saved content generations                   │ │
│  │ generation_logs: Agent execution logs                    │ │
│  │ checkpoints: Retry/resume state (planned)               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Persistence Strategy:                                       │
│  - Zustand persists to localStorage (topic, content, etc.)  │
│  - Completed generations save to Supabase                    │
│  - Real-time sync via Supabase Realtime (enabled)           │
└──────────────────────────────────────────────────────────────┘
```

## 3.6 Authentication Layer

| Component           | Technology                       |
| ------------------- | -------------------------------- |
| **Provider**        | Supabase Auth                    |
| **Methods**         | Google OAuth, Email/Password     |
| **Session Storage** | Cookies (via @supabase/ssr)      |
| **Middleware**      | Session refresh on every request |

**Implementation Notes:**

- Profile fetch uses direct REST API with timeout (10s max)
- Fallback to localStorage for session token if needed
- Safety timeout prevents indefinite loading state
- RLS policies enforce user data isolation

## 3.7 Build & Development Tools

| Tool             | Purpose             |
| ---------------- | ------------------- |
| **ESLint**       | Code linting        |
| **PostCSS**      | CSS processing      |
| **Autoprefixer** | CSS vendor prefixes |
| **TypeScript**   | Type checking       |

## 3.8 Stack Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                           │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │ React 19     │◄───│ Zustand      │◄───│ localStorage           │ │
│  │ Components   │    │ State Store  │    │ (persisted state)      │ │
│  └──────┬───────┘    └──────────────┘    └────────────────────────┘ │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SafeMarkdown: react-markdown + rehype-* + remark-* + KaTeX   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP/SSE
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Next.js Server (API Routes)                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │ /api/stream     │    │ /api/generate   │    │ /api/admin/*     │  │
│  │ (xAI Grok       │    │ (DB operations) │    │ (Budget mgmt)    │  │
│  │  proxy + SSE)   │    │                 │    │                  │  │
│  └────────┬────────┘    └────────┬────────┘    └────────┬─────────┘  │
└───────────┼──────────────────────┼──────────────────────┼────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌───────────────────┐    ┌──────────────────────────────────────────────┐
│   xAI Grok API    │    │              Supabase (PostgreSQL)           │
│  ┌─────────────┐  │    │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ grok-4-1-   │  │    │  │ profiles │  │generations│  │   logs    │  │
│  │ fast-       │  │    │  │          │  │           │  │           │  │
│  │ reasoning   │  │    │  └──────────┘  └───────────┘  └───────────┘  │
│  └─────────────┘  │    │                                              │
└───────────────────┘    │  ┌──────────────────────────────────────┐    │
                         │  │ Row Level Security (RLS) Policies    │    │
                         │  │ - Users see only own data            │    │
                         │  │ - Admins see all data                │    │
                         │  └──────────────────────────────────────┘    │
                         └──────────────────────────────────────────────┘
```

---

# 4. Application Architecture

## 4.1 Architectural Pattern

The application follows a **Modular Agentic Architecture** with these key patterns:

| Pattern                   | Implementation                                       |
| ------------------------- | ---------------------------------------------------- |
| **Multi-Agent Pipeline**  | 7 specialized AI agents in sequential workflow       |
| **Client-Server Split**   | Next.js with API routes for secure server operations |
| **Domain-Driven Modules** | Agents, prompts, types, utils separated by concern   |
| **Repository Pattern**    | Supabase client abstracts database operations        |
| **Observer Pattern**      | Zustand store with subscribers for state changes     |
| **Strategy Pattern**      | Different prompts/behavior per content mode          |

## 4.2 Logical Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│   Next.js Pages + React Components + Zustand UI State               │
│   - app/page.tsx, app/editor/page.tsx, app/archives/page.tsx        │
│   - components/ui/*, components/layout/*, components/editor/*       │
├─────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                             │
│   Hooks + Orchestration Logic + State Management                     │
│   - hooks/useGeneration.ts (orchestration entry point)              │
│   - hooks/useAuth.tsx (authentication flow)                         │
│   - lib/store/generation.ts (state container)                       │
├─────────────────────────────────────────────────────────────────────┤
│                         DOMAIN LAYER                                 │
│   AI Agents + Business Logic + Prompts                              │
│   - lib/agents/* (CourseDetector, Analyzer, Creator, etc.)         │
│   - prompts/creator/* (domain-specific prompts)                     │
│   - lib/utils/quality-gate.ts, cache.ts, context-manager.ts        │
├─────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                            │
│   External Service Clients + Persistence                            │
│   - lib/xai/client.ts (AI API via OpenAI SDK)                       │
│   - lib/anthropic/client.ts (re-exports XAIClient for compat)      │
│   - lib/supabase/client.ts, server.ts (Database)                   │
│   - lib/storage/persistence.ts (Save logic)                         │
│   - app/api/* (API route handlers)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## 4.3 Agent Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AGENT ORCHESTRATION PIPELINE                      │
│                                                                          │
│   Input: topic + subtopics + mode + (optional) transcript                │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 0: PARALLEL ANALYSIS                                      │   │
│   │  ┌───────────────────┐    ┌───────────────────┐                 │   │
│   │  │  CourseDetector   │    │     Analyzer      │                 │   │
│   │  │  (Domain detect)  │    │  (Gap analysis)   │                 │   │
│   │  │  [Haiku]          │    │  [Haiku]          │                 │   │
│   │  └─────────┬─────────┘    └─────────┬─────────┘                 │   │
│   │            │                        │                            │   │
│   │            ▼                        ▼                            │   │
│   │    CourseContext              GapAnalysisResult                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 1: CREATION (Streaming)                                   │   │
│   │  ┌───────────────────────────────────────────────────────────┐  │   │
│   │  │                        Creator                             │  │   │
│   │  │  Inputs: topic, subtopics, transcript, gapAnalysis,       │  │   │
│   │  │          courseContext, assignmentCounts                   │  │   │
│   │  │  Output: Raw content (markdown/JSON)                       │  │   │
│   │  │  [Sonnet] - 60s average                                    │  │   │
│   │  └───────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 2: SANITIZATION (if transcript provided)                  │   │
│   │  ┌───────────────────────────────────────────────────────────┐  │   │
│   │  │                       Sanitizer                            │  │   │
│   │  │  Inputs: content, transcript                               │  │   │
│   │  │  Output: Fact-checked content                              │  │   │
│   │  │  [Haiku] - Removes contradictions                          │  │   │
│   │  └───────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 3: QUALITY LOOP (max 3 iterations)                        │   │
│   │                                                                  │   │
│   │  ┌─────────────┐         ┌─────────────┐                        │   │
│   │  │  Reviewer   │◄───────►│   Refiner   │                        │   │
│   │  │  [Sonnet]   │         │  [Sonnet]   │                        │   │
│   │  │  Score: 1-10│         │ Patch-based │                        │   │
│   │  └─────────────┘         └─────────────┘                        │   │
│   │                                                                  │   │
│   │  Exit conditions:                                                │   │
│   │  - Score ≥ 9 (first iteration) or ≥ 8 (subsequent)             │   │
│   │  - Max 3 iterations reached                                      │   │
│   │  - No further improvements suggested                             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 4: FORMATTING (assignment mode only)                      │   │
│   │  ┌─────────────────────────────────────────────────────────────┐│   │
│   │  │              Formatter → AssignmentSanitizer                ││   │
│   │  │  [Haiku]        →         [Sonnet]                          ││   │
│   │  │  JSON cleanup   →      Question validation                   ││   │
│   │  │                 →      Invalid question replacement          ││   │
│   │  └─────────────────────────────────────────────────────────────┘│   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│                            Final Output                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4.4 Component Responsibility Matrix

| Component                  | Responsibility             | Dependencies          | Dependents                |
| -------------------------- | -------------------------- | --------------------- | ------------------------- |
| `Orchestrator`             | Coordinates agent pipeline | All agents, XAIClient | useGeneration             |
| `CreatorAgent`             | Generates initial content  | XAIClient, Prompts    | Orchestrator              |
| `AnalyzerAgent`            | Gap analysis               | XAIClient             | Orchestrator              |
| `SanitizerAgent`           | Fact verification          | XAIClient             | Orchestrator              |
| `ReviewerAgent`            | Quality scoring            | XAIClient             | Orchestrator              |
| `RefinerAgent`             | Content improvement        | XAIClient             | Orchestrator              |
| `FormatterAgent`           | JSON formatting            | XAIClient             | Orchestrator              |
| `CourseDetectorAgent`      | Domain detection           | XAIClient             | Orchestrator              |
| `AssignmentSanitizerAgent` | Question validation        | XAIClient             | Orchestrator              |
| `XAIClient`                | API communication          | OpenAI SDK            | All agents                |
| `useGeneration`            | React orchestration hook   | Orchestrator, Store   | Editor page               |
| `useGenerationStore`       | State container            | Zustand               | useGeneration, components |
| `saveGeneration`           | Persistence                | Supabase              | useGeneration             |
| `AuthGuard`                | Route protection           | useAuth               | Layout                    |
| `SafeMarkdown`             | Content rendering          | rehype, remark, KaTeX | Editor, Preview           |

## 4.5 Dependency Direction Analysis

```
                    DEPENDENCY DIRECTION (Clean Architecture)

              UI Layer ──────────────────────────► Infrastructure

┌─────────────────┐                              ┌─────────────────┐
│   Components    │                              │    Supabase     │
│   - Editor      │ ◄─────────────────────────── │    Client       │
│   - Preview     │                              │                 │
│   - Stepper     │                              └─────────────────┘
└────────┬────────┘                                      ▲
         │                                               │
         │ uses                                          │ uses
         ▼                                               │
┌─────────────────┐                              ┌───────┴─────────┐
│   Hooks Layer   │ ────────────────────────────►│   Anthropic     │
│   - useGeneration                              │   Client        │
│   - useAuth     │                              │                 │
└────────┬────────┘                              └─────────────────┘
         │                                               ▲
         │ orchestrates                                  │ uses
         ▼                                               │
┌─────────────────┐                              ┌───────┴─────────┐
│   Agent Layer   │ ────────────────────────────►│   Prompts       │
│   - Orchestrator│                              │   - creator/*   │
│   - Creator     │                              │                 │
│   - Reviewer    │                              └─────────────────┘
│   - etc.        │
└────────┬────────┘
         │
         │ extends
         ▼
┌─────────────────┐
│   Base Agent    │
│   - Abstract    │
│   - model prop  │
│   - client prop │
└─────────────────┘

NOTABLE COUPLING POINTS (Technical Debt):
- useGeneration directly instantiates Orchestrator (tight coupling)
- Agents hardcode model names (should be configurable)
- Store accessed directly from components (could use selectors)
```

## 4.6 Data Ownership Boundaries

| Domain                 | Owner               | Data                         |
| ---------------------- | ------------------- | ---------------------------- |
| **Authentication**     | Supabase Auth       | User sessions, OAuth tokens  |
| **User Profiles**      | `profiles` table    | Credits, roles, email        |
| **Generation State**   | Zustand store       | In-progress generation state |
| **Generation History** | `generations` table | Completed generations        |
| **AI Communication**   | XAIClient           | API requests/responses       |
| **Content Rendering**  | SafeMarkdown        | Parsed/sanitized HTML        |

---

# 5. Frontend Deep Dive

## 5.1 Application Entry Point

**File:** `src/app/layout.tsx`

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>           {/* QueryClient, Auth, Theme, Sidebar */}
          <AuthGuard>         {/* Route protection */}
            <div className="flex flex-col h-screen">
              <Header />      {/* Top navigation + budget display */}
              <div className="flex flex-1">
                <Sidebar />   {/* Side navigation */}
                <main>
                  <ErrorBoundary>
                    {children}  {/* Page content */}
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
```

### Provider Hierarchy

```
QueryClientProvider          (TanStack Query)
  └─► AuthProvider           (Supabase Auth context)
       └─► ThemeProvider     (Theme context)
            └─► SidebarProvider  (Sidebar state)
                 └─► Children
```

## 5.2 Routing Strategy

The application uses **Next.js App Router** (file-system based routing):

| Route            | Page              | Auth Required | Admin Only |
| ---------------- | ----------------- | ------------- | ---------- |
| `/`              | Dashboard/Landing | Yes           | No         |
| `/editor`        | Content Editor    | Yes           | No         |
| `/archives`      | Saved Generations | Yes           | No         |
| `/users`         | User Management   | Yes           | Yes        |
| `/login`         | Login Page        | No            | No         |
| `/auth/callback` | OAuth Callback    | No            | No         |

### Route Protection Flow

```
User navigates to /editor
         │
         ▼
┌─────────────────────┐
│    AuthGuard        │
│  Check isLoading    │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │isLoading? │
    └─────┬─────┘
          │
    Yes ──┼── No
          │      │
          ▼      ▼
┌─────────────┐  ┌─────────────┐
│Show Spinner │  │Check user   │
└─────────────┘  └──────┬──────┘
                        │
                  ┌─────┴─────┐
                  │  user?    │
                  └─────┬─────┘
                        │
                  Yes ──┼── No
                        │      │
                        ▼      ▼
              ┌─────────────┐  ┌─────────────┐
              │Render Page  │  │Redirect to  │
              │             │  │/login       │
              └─────────────┘  └─────────────┘
```

## 5.3 Page vs Component Architecture

### Page Components (Route-Level)

| Page     | Location                | Responsibility                  |
| -------- | ----------------------- | ------------------------------- |
| Home     | `app/page.tsx`          | Dashboard with feature showcase |
| Editor   | `app/editor/page.tsx`   | Main content generation UI      |
| Archives | `app/archives/page.tsx` | View/restore saved generations  |
| Login    | `app/login/page.tsx`    | Authentication forms            |
| Users    | `app/users/page.tsx`    | Admin user management           |

### Shared Components

| Component             | Location             | Purpose                                    |
| --------------------- | -------------------- | ------------------------------------------ |
| `SafeMarkdown`        | `components/ui/`     | XSS-safe markdown rendering with math/code |
| `Mermaid`             | `components/ui/`     | Diagram rendering                          |
| `Header`              | `components/layout/` | App header with budget display             |
| `Sidebar`             | `components/layout/` | Navigation menu                            |
| `AuthGuard`           | `components/auth/`   | Route protection                           |
| `GenerationStepper`   | `components/editor/` | Pipeline progress display                  |
| `GapAnalysisPanel`    | `components/editor/` | Coverage visualization                     |
| `AssignmentWorkspace` | `components/editor/` | Assignment JSON editor                     |
| `MetricsDashboard`    | `components/editor/` | Cost/performance metrics                   |

## 5.4 State Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EDITOR PAGE STATE FLOW                           │
│                                                                         │
│  ┌─────────────┐                    ┌─────────────────────────────────┐│
│  │ User Input  │                    │    useGenerationStore (Zustand) ││
│  │ - topic     │ ───setTopic()────► │    Persisted to localStorage    ││
│  │ - subtopics │ ───setSubtopics()─►│                                 ││
│  │ - mode      │ ───setMode()──────►│ ┌────────────────────────────┐  ││
│  │ - transcript│ ───setTranscript()►│ │ State:                     │  ││
│  └─────────────┘                    │ │ - topic, subtopics, mode   │  ││
│                                     │ │ - status: idle|generating  │  ││
│  ┌─────────────┐                    │ │ - finalContent             │  ││
│  │ Start Gen   │ ──startGeneration()│ │ - formattedContent         │  ││
│  └─────────────┘        │           │ │ - gapAnalysis              │  ││
│                         │           │ │ - logs[]                   │  ││
│                         ▼           │ │ - currentAgent             │  ││
│  ┌──────────────────────────────┐   │ │ - estimatedCost            │  ││
│  │     useGeneration Hook       │   │ └────────────────────────────┘  ││
│  │                              │   │                                 ││
│  │  Creates Orchestrator        │   └─────────────────────────────────┘│
│  │  Iterates over generator     │                                      │
│  │  Processes events:           │                                      │
│  │    - step → setCurrentAgent()│                                      │
│  │    - chunk → updateContent() │                                      │
│  │    - gap_analysis → setGap() │                                      │
│  │    - complete → save()       │                                      │
│  └──────────────────────────────┘                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      UI Components                               │   │
│  │  ┌───────────────┐  ┌─────────────┐  ┌────────────────────────┐ │   │
│  │  │GenerationStepper│ │MarkdownPreview│ │  AssignmentWorkspace │ │   │
│  │  │  reads: logs,  │  │ reads:        │  │  reads: formatted   │ │   │
│  │  │  currentAgent  │  │ finalContent  │  │  Content            │ │   │
│  │  └───────────────┘  └─────────────┘  └────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## 5.5 Side Effects and Async Handling

### Generation Flow (Async Generator Pattern)

```typescript
// useGeneration.ts - Main async flow
const startGeneration = async () => {
  // 1. Budget check
  const budgetCheck = await checkBudget();
  if (!budgetCheck.allowed) return;

  // 2. Create orchestrator
  const orchestrator = new Orchestrator(apiKey);

  // 3. Iterate over async generator
  const generator = orchestrator.generate(params, controller.signal);
  for await (const event of generator) {
    // 4. Process events
    switch (event.type) {
      case 'step': store.setCurrentAgent(event.agent); break;
      case 'chunk': store.updateContent(event.content); break;
      case 'gap_analysis': store.setGapAnalysis(event.content); break;
      case 'complete': await saveGeneration(...); break;
    }
  }
};
```

### Content Buffer Throttling

The store uses a throttled content buffer to prevent excessive re-renders during streaming:

```typescript
// Throttled content update - buffers chunks and flushes every 150ms
updateContent: (chunk) => {
  contentBuffer += chunk;
  const now = Date.now();

  if (now - lastFlushTime >= FLUSH_INTERVAL) {
    // Flush immediately
    set((state) => ({ finalContent: state.finalContent + contentBuffer }));
    contentBuffer = "";
    lastFlushTime = now;
  } else if (!flushTimeout) {
    // Schedule flush
    flushTimeout = setTimeout(() => {
      /* flush */
    }, remainingTime);
  }
};
```

## 5.6 Forms, Validation, and UX Logic

### Editor Form State

| Field             | Type          | Validation                                    |
| ----------------- | ------------- | --------------------------------------------- |
| Topic             | Text          | Required, non-empty                           |
| Subtopics         | Textarea      | Required, multiline supported                 |
| Mode              | Select        | enum: 'lecture' \| 'pre-read' \| 'assignment' |
| Transcript        | File/Textarea | Optional, .txt files supported                |
| Assignment Counts | Number inputs | Positive integers (default: 5/3/2)            |

### Assignment Workspace Editing

The `AssignmentWorkspace` component provides:

- Table view for bulk editing
- Reference view for preview
- Inline JSON editing via textareas
- Real-time validation (options required for MCQ types)
- CSV export functionality

## 5.7 Error Handling Strategy (Frontend)

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND ERROR HANDLING                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Level 1: Component ErrorBoundary                           │ │
│  │  - Catches render errors                                    │ │
│  │  - Shows fallback UI                                        │ │
│  │  - Logs to console                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Level 2: Hook-Level Error State                            │ │
│  │  - useGeneration tracks error state                         │ │
│  │  - Displays error message in UI                             │ │
│  │  - Allows retry via clearStorage()                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Level 3: Abort Controller                                  │ │
│  │  - User can stop generation mid-flight                      │ │
│  │  - AbortError caught and handled gracefully                 │ │
│  │  - Status set to 'idle'                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Level 4: Store Persistence Recovery                        │ │
│  │  - 'generating' status reset to 'idle' on rehydration       │ │
│  │  - Prevents stuck states after page reload                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

# 6. Backend / Server Deep Dive

## 6.1 API Route Entry Points

| Route                      | Method | Handler    | Purpose                                          |
| -------------------------- | ------ | ---------- | ------------------------------------------------ |
| `/api/stream`              | POST   | `route.ts` | Streaming xAI Grok API proxy                     |
| `/api/stream`              | PUT    | `route.ts` | Non-streaming xAI Grok API proxy                 |
| `/api/generate`            | POST   | `route.ts` | Create generation record + trigger Edge Function |
| `/api/retry`               | POST   | `route.ts` | Retry failed generation                          |
| `/api/admin/reset-credits` | POST   | Inferred   | Reset user credits                               |
| `/api/debug/profile`       | GET    | Inferred   | Debug profile data                               |
| `/api/debug/supabase`      | GET    | Inferred   | Debug Supabase connection                        |

## 6.2 Request Lifecycle

### `/api/stream` (POST) - Streaming Proxy

```
┌────────────────────────────────────────────────────────────────────────┐
│                    /api/stream REQUEST LIFECYCLE                        │
│                                                                         │
│  Client Request                                                         │
│  POST /api/stream                                                       │
│  Body: { system, messages, model, maxTokens, temperature }              │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. AUTH CHECK                                                   │   │
│  │     const supabase = await createServerSupabaseClient();         │   │
│  │     const { user } = await supabase.auth.getUser();              │   │
│  │     if (!user) return 401 Unauthorized                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  2. API KEY CHECK                                                │   │
│  │     if (!process.env.XAI_API_KEY) return 500                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  3. CREATE GROK STREAM                                           │   │
│  │     const stream = await xai.chat.completions.create({           │   │
│  │       model, max_tokens, messages, temperature,                  │   │
│  │       stream: true                                               │   │
│  │     });  // OpenAI-compatible API                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  4. TRANSFORM TO SSE                                             │   │
│  │     for await (chunk of stream) {                                │   │
│  │       if (chunk.type === 'content_block_delta') {                │   │
│  │         controller.enqueue(`data: ${JSON.stringify({             │   │
│  │           type: 'chunk', content: chunk.delta.text               │   │
│  │         })}\n\n`);                                                │   │
│  │       }                                                          │   │
│  │     }                                                            │   │
│  │     controller.enqueue('data: [DONE]\n\n');                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  Response: ReadableStream with SSE format                               │
│  Content-Type: text/event-stream                                        │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Business Logic Placement

| Logic Type             | Location                     | Rationale                                      |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| **AI Orchestration**   | `lib/agents/orchestrator.ts` | Core business logic, decoupled from HTTP       |
| **Content Prompts**    | `prompts/creator/index.ts`   | Separated from agent logic for maintainability |
| **Cost Calculation**   | `lib/xai/token-counter.ts`   | Reusable utility                               |
| **Quality Validation** | `lib/utils/quality-gate.ts`  | Agent-agnostic validation                      |
| **Persistence**        | `lib/storage/persistence.ts` | Decoupled from React hooks                     |
| **Auth Logic**         | `hooks/useAuth.tsx`          | Client-side auth state management              |
| **Budget Check**       | `hooks/useGeneration.ts`     | Pre-generation validation                      |

## 6.4 Input Validation

### API Route Validation

| Route           | Validation                                           |
| --------------- | ---------------------------------------------------- |
| `/api/stream`   | Auth required, `messages` and `model` required       |
| `/api/generate` | Auth required, `topic`, `subtopics`, `mode` required |

### Agent Input Validation

| Agent                 | Input Validation                              |
| --------------------- | --------------------------------------------- |
| `Analyzer`            | Subtopics normalized (split by comma/newline) |
| `Creator`             | Mode validated against enum                   |
| `Formatter`           | JSON parsing with fallback recovery           |
| `AssignmentSanitizer` | Question structure validation                 |

## 6.5 Middleware Behavior

**File:** `src/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

**Purpose:** Refreshes Supabase session cookies on every request to prevent token expiration.

**Matcher Configuration:**

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback).*)",
  ],
};
```

**Excluded Paths:**

- Static assets (`_next/static`, `_next/image`)
- Images (svg, png, jpg, etc.)
- OAuth callback (`auth/callback`) - Prevents redirect loops

## 6.6 Background Jobs / Workers

**Current State:** Multiple processing approaches are implemented:

### 1. Client-Side Processing (Primary)

Generations run **client-side** via the `useGeneration` hook with real-time streaming. This is the main user-facing flow.

### 2. Server-Side Job Queue (Available)

Implemented in `lib/queue/job-queue.ts` and `lib/queue/worker.ts`:

- `JobQueue` class manages server-side generation jobs
- `GenerationWorker` processes jobs asynchronously
- API routes: `/api/jobs` (POST/GET) and `/api/process` (POST)
- Jobs can run up to 5 minutes (maxDuration: 300)

### 3. Edge Function Approach (Planned)

The `supabase/functions/generate-content/index.ts` exists but Edge Functions are triggered with fallback:

```typescript
// From /api/generate - tries Edge Function, falls back to inline processing
const { error: fnError } = await serviceClient.functions.invoke('generate-content', {
  body: { generation_id: generation.id },
});

if (fnError) {
  // Fallback: Process inline using xAI calls
  processInline(generation.id, params).catch(...);
}
```

### 4. Process Stuck Generations

`/api/process-stuck` endpoint can reprocess generations stuck in 'processing' state.

**Primary Flow:** Client-side streaming for immediate feedback. Server-side options available for background processing if needed.

---

# 7. API & Data Contracts

## 7.1 API Endpoints

### POST `/api/stream` - Streaming xAI Grok Proxy

**Request:**

```typescript
{
  system: string;           // System prompt
  messages: Array<{         // Conversation messages
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;            // e.g., 'grok-4-1-fast-reasoning-latest'
  maxTokens?: number;       // Default: 10000
  temperature?: number;     // Default: 0.7
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {"type":"chunk","content":"Hello"}\n\n
data: {"type":"chunk","content":" world"}\n\n
data: [DONE]\n\n
```

**Error Response:**

```typescript
{
  error: string;
} // HTTP 401, 400, or 500
```

### PUT `/api/stream` - Non-Streaming xAI Grok Proxy

**Request:** Same as POST

**Response:**

```typescript
{
  content: Array<{ type: 'text', text: string }>;
  usage: { input_tokens: number, output_tokens: number };
}
```

### POST `/api/generate` - Create Generation Record

**Request:**

```typescript
{
  topic: string;
  subtopics: string;
  mode: 'lecture' | 'pre-read' | 'assignment';
  transcript?: string;
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}
```

**Response:**

```typescript
{
  success: true;
  generation_id: string; // UUID
  status: "queued";
}
```

## 7.2 Internal Data Contracts

### Generation Event Types (Orchestrator → useGeneration)

| Event Type        | Payload                              | Purpose                    |
| ----------------- | ------------------------------------ | -------------------------- |
| `step`            | `{ agent, status, action, message }` | Agent progress update      |
| `chunk`           | `{ content: string }`                | Streaming content chunk    |
| `gap_analysis`    | `GapAnalysisResult`                  | Coverage analysis complete |
| `course_detected` | `CourseContext`                      | Domain detection complete  |
| `replace`         | `{ content: string }`                | Full content replacement   |
| `formatted`       | `{ content: string }`                | Assignment JSON ready      |
| `complete`        | `{ content, cost, metrics }`         | Generation finished        |
| `mismatch_stop`   | `{ message, cost }`                  | Transcript mismatch        |
| `error`           | `{ message: string }`                | Error occurred             |

### GapAnalysisResult

```typescript
interface GapAnalysisResult {
  covered: string[]; // Fully covered subtopics
  notCovered: string[]; // Not covered subtopics
  partiallyCovered: string[]; // Partially covered subtopics
  transcriptTopics: string[]; // Topics found in transcript
  timestamp: string; // ISO timestamp
}
```

### CourseContext

```typescript
interface CourseContext {
  domain: string; // e.g., 'backend-web-development'
  confidence: number; // 0-1 score
  characteristics: {
    exampleTypes: string[]; // e.g., ['API examples', 'debugging scenarios']
    formats: string[]; // e.g., ['code blocks', 'mermaid diagrams']
    vocabulary: string[]; // Domain-specific terms
    styleHints: string[]; // Writing style guidelines
    relatableExamples: string[];
  };
  contentGuidelines: string; // Detailed creation guidelines
  qualityCriteria: string; // Quality review criteria
}
```

### AssignmentItem

```typescript
interface AssignmentItem {
  questionType: "mcsc" | "mcmc" | "subjective";
  contentType: "markdown";
  contentBody: string;
  options: { 1: string; 2: string; 3: string; 4: string };
  mcscAnswer?: number; // 1-4 for single correct
  mcmcAnswer?: string; // "1, 3" for multiple correct
  subjectiveAnswer?: string; // Model answer
  difficultyLevel: 0 | 0.5 | 1;
  answerExplanation: string;
}
```

## 7.3 Error Formats

### API Errors

```typescript
// Standard error response
{
  error: string;
}

// Specific error scenarios:
{
  error: "Unauthorized";
} // 401
{
  error: "Missing required fields: ...";
} // 400
{
  error: "xAI API key not configured";
} // 500
```

### Persistence Errors

```typescript
interface SaveResult {
  success: boolean;
  generation_id?: string;
  error?: string;
  retryCount?: number;
}
```

## 7.4 Versioning Strategy

**Current State:** No API versioning implemented.

**Observation:** The API is internal-only and the frontend/backend are deployed together, reducing versioning concerns.

---

# 8. Database & Data Model

## 8.1 Database Type

- **Database:** PostgreSQL (via Supabase)
- **Extensions:** `uuid-ossp` for UUID generation
- **Access:** Row Level Security (RLS) policies enforce multi-tenancy

## 8.2 Schema Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                               │
│                                                                       │
│  ┌─────────────────────┐       ┌─────────────────────┐               │
│  │      auth.users     │       │      profiles       │               │
│  │  (Supabase Auth)    │◄──────│                     │               │
│  │                     │  1:1  │  id (PK, FK)        │               │
│  │  id                 │       │  email              │               │
│  │  email              │       │  role: user|admin   │               │
│  │  ...                │       │  credits (cents)    │               │
│  └─────────────────────┘       │  spent_credits      │               │
│                                │  created_at         │               │
│                                │  updated_at         │               │
│                                └──────────┬──────────┘               │
│                                           │                          │
│                                           │ 1:N                      │
│                                           ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                          generations                             │ │
│  │                                                                  │ │
│  │  id (UUID, PK)          user_id (FK → profiles)                 │ │
│  │  topic                  subtopics                                │ │
│  │  mode (enum)            status (enum)                           │ │
│  │  current_step           transcript                               │ │
│  │  final_content          assignment_data (JSONB)                 │ │
│  │  gap_analysis (JSONB)   course_context (JSONB)                  │ │
│  │  error_message          estimated_cost (DECIMAL)                │ │
│  │  locked_by (FK)         created_at, updated_at                  │ │
│  └──────────────────────────────────┬──────────────────────────────┘ │
│                                     │                                │
│                    ┌────────────────┼────────────────┐               │
│                    │                │                │               │
│                    ▼                ▼                ▼               │
│  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   generation_logs   │  │   checkpoints   │  │  (Realtime)     │  │
│  │                     │  │                 │  │                 │  │
│  │  generation_id (FK) │  │ generation_id   │  │  Enabled for:   │  │
│  │  agent_name         │  │ step_name       │  │  - generations  │  │
│  │  message            │  │ step_number     │  │  - gen_logs     │  │
│  │  log_type (enum)    │  │ content_snapshot│  │                 │  │
│  │  metadata (JSONB)   │  │ metadata (JSONB)│  │                 │  │
│  │  created_at         │  │ created_at      │  │                 │  │
│  └─────────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## 8.3 Table Breakdown

### `profiles`

| Column          | Type        | Constraints              | Description                                                                                                                                                                     |
| --------------- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID        | PK, FK → auth.users      | User identifier                                                                                                                                                                 |
| `email`         | TEXT        | NOT NULL                 | User email                                                                                                                                                                      |
| `role`          | user_role   | NOT NULL, DEFAULT 'user' | 'admin' or 'user'                                                                                                                                                               |
| `credits`       | INTEGER     | NOT NULL, DEFAULT 0      | Budget in cents (100 = $1.00)                                                                                                                                                   |
| `spent_credits` | INTEGER     | NOT NULL, DEFAULT 0      | **Total spent in cents (persistent).** Tracks lifetime spending independent of generation deletion. Use `increment_spent_credits(user_id, amount)` function for atomic updates. |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()  | Creation timestamp                                                                                                                                                              |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()  | Last update                                                                                                                                                                     |

### `generations`

| Column            | Type              | Constraints                    | Description                             |
| ----------------- | ----------------- | ------------------------------ | --------------------------------------- |
| `id`              | UUID              | PK, DEFAULT uuid_generate_v4() | Generation identifier                   |
| `user_id`         | UUID              | FK → profiles, NOT NULL        | Owner                                   |
| `topic`           | TEXT              | NOT NULL                       | Content topic                           |
| `subtopics`       | TEXT              | NOT NULL                       | Learning objectives                     |
| `mode`            | content_mode      | NOT NULL                       | 'lecture' \| 'pre-read' \| 'assignment' |
| `status`          | generation_status | DEFAULT 'queued'               | Processing state                        |
| `current_step`    | INTEGER           | DEFAULT 0                      | Pipeline progress                       |
| `transcript`      | TEXT              | NULLABLE                       | Source transcript                       |
| `final_content`   | TEXT              | NULLABLE                       | Generated content                       |
| `assignment_data` | JSONB             | NULLABLE                       | Formatted assignment JSON               |
| `gap_analysis`    | JSONB             | NULLABLE                       | Coverage analysis                       |
| `course_context`  | JSONB             | NULLABLE                       | Detected domain context                 |
| `error_message`   | TEXT              | NULLABLE                       | Error details if failed                 |
| `estimated_cost`  | DECIMAL(10,6)     | DEFAULT 0                      | Cost in dollars                         |
| `locked_by`       | UUID              | FK → profiles                  | Lock for concurrent editing             |
| `created_at`      | TIMESTAMPTZ       | DEFAULT NOW()                  | Creation timestamp                      |
| `updated_at`      | TIMESTAMPTZ       | DEFAULT NOW()                  | Last update                             |

### `generation_logs`

| Column          | Type        | Description                                           |
| --------------- | ----------- | ----------------------------------------------------- |
| `id`            | UUID        | Log entry identifier                                  |
| `generation_id` | UUID        | Associated generation                                 |
| `agent_name`    | TEXT        | Agent that generated log                              |
| `message`       | TEXT        | Log message                                           |
| `log_type`      | log_type    | 'info' \| 'success' \| 'warning' \| 'error' \| 'step' |
| `metadata`      | JSONB       | Additional context                                    |
| `created_at`    | TIMESTAMPTZ | Timestamp                                             |

### `checkpoints`

| Column             | Type        | Description           |
| ------------------ | ----------- | --------------------- |
| `id`               | UUID        | Checkpoint identifier |
| `generation_id`    | UUID        | Associated generation |
| `step_name`        | TEXT        | Pipeline step name    |
| `step_number`      | INTEGER     | Step index            |
| `content_snapshot` | TEXT        | Content at checkpoint |
| `metadata`         | JSONB       | Step metadata         |
| `created_at`       | TIMESTAMPTZ | Timestamp             |

## 8.4 Enums

```sql
CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TYPE generation_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed',
  'waiting_approval'
);

CREATE TYPE content_mode AS ENUM ('pre-read', 'lecture', 'assignment');

CREATE TYPE log_type AS ENUM ('info', 'success', 'warning', 'error', 'step');
```

## 8.5 Indexes

| Index                               | Table           | Columns                         | Purpose                   |
| ----------------------------------- | --------------- | ------------------------------- | ------------------------- |
| `idx_generations_user_id`           | generations     | user_id                         | User's generations lookup |
| `idx_generations_status`            | generations     | status                          | Status filtering          |
| `idx_generations_created_at`        | generations     | created_at DESC                 | Chronological listing     |
| `idx_generation_logs_generation_id` | generation_logs | generation_id                   | Logs by generation        |
| `idx_generation_logs_created_at`    | generation_logs | created_at                      | Log ordering              |
| `idx_checkpoints_generation_id`     | checkpoints     | generation_id                   | Checkpoints lookup        |
| `idx_checkpoints_step_number`       | checkpoints     | generation_id, step_number DESC | Latest checkpoint         |

## 8.6 Triggers

| Trigger                         | Table       | Event         | Function                     | Purpose               |
| ------------------------------- | ----------- | ------------- | ---------------------------- | --------------------- |
| `on_auth_user_created`          | auth.users  | AFTER INSERT  | `handle_new_user()`          | Auto-create profile   |
| `update_profiles_updated_at`    | profiles    | BEFORE UPDATE | `update_updated_at_column()` | Auto-update timestamp |
| `update_generations_updated_at` | generations | BEFORE UPDATE | `update_updated_at_column()` | Auto-update timestamp |

## 8.7 Data Lifecycle

```
User Signs Up → Trigger creates profile (credits: 0, spent_credits: 0)
                          │
                          ▼
Admin sets credits ──────►│
                          │
                          ▼
User creates generation → Status: queued
                          │
                          ▼
                    Generation runs → Status: processing
                          │
                          ├─► Success → Status: completed
                          │              final_content set
                          │              estimated_cost set
                          │              spent_credits incremented (persists even if deleted)
                          │
                          └─► Failure → Status: failed
                                        error_message set
                          │
                          ▼
User deletes generation → Cascade deletes logs + checkpoints
                          (spent_credits remains unchanged - budget not refunded)
```

---

# 9. Authentication & Authorization

## 9.1 Authentication Mechanism

| Component           | Implementation                        |
| ------------------- | ------------------------------------- |
| **Provider**        | Supabase Auth                         |
| **Methods**         | Google OAuth, Email/Password          |
| **Session Storage** | HTTP-only cookies (via @supabase/ssr) |
| **Token Refresh**   | Middleware on every request           |

## 9.2 Authentication Flow

### Google OAuth Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GOOGLE OAUTH FLOW                                │
│                                                                      │
│  1. User clicks "Sign in with Google"                               │
│     │                                                                │
│     ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  signInWithGoogle() in useAuth.tsx                             │ │
│  │  → supabase.auth.signInWithOAuth({                             │ │
│  │      provider: 'google',                                        │ │
│  │      options: { redirectTo: `${origin}/auth/callback` }        │ │
│  │    })                                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│     │                                                                │
│     ▼                                                                │
│  2. User redirected to Google → Authenticates → Redirected back     │
│     │                                                                │
│     ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  /auth/callback route                                          │ │
│  │  → Supabase exchanges code for session                         │ │
│  │  → Session stored in cookies                                   │ │
│  │  → Redirect to / or intended page                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│     │                                                                │
│     ▼                                                                │
│  3. on_auth_user_created trigger creates profile                    │
│     │                                                                │
│     ▼                                                                │
│  4. AuthProvider fetches profile, user is logged in                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Refresh Flow

```
Every Request → middleware.ts
                    │
                    ▼
              updateSession()
                    │
                    ▼
        supabase.auth.getUser()
                    │
         ┌─────────┴─────────┐
         │                   │
    Token valid         Token expired
         │                   │
         ▼                   ▼
    Continue           Refresh token
                            │
                    ┌───────┴───────┐
                    │               │
              Refresh OK      Refresh failed
                    │               │
                    ▼               ▼
              New cookie      User logged out
```

## 9.3 Role/Permission Model

| Role      | Permissions                                                           |
| --------- | --------------------------------------------------------------------- |
| **user**  | View own profile, CRUD own generations, view own logs                 |
| **admin** | All user permissions + view all profiles/generations + update credits |

### Permission Check

```typescript
// Check if current user is admin
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 9.4 Row Level Security Policies

### Profiles Table

| Policy                           | Operation | Rule                 |
| -------------------------------- | --------- | -------------------- |
| Users can view own profile       | SELECT    | `auth.uid() = id`    |
| Users can update own profile     | UPDATE    | `auth.uid() = id`    |
| Users can insert own profile     | INSERT    | `auth.uid() = id`    |
| Admins can view all profiles     | SELECT    | `is_admin()`         |
| Admins can update all profiles   | UPDATE    | `is_admin()`         |
| Service role can insert profiles | INSERT    | `true` (for trigger) |

### Generations Table

| Policy                            | Operation | Rule                                         |
| --------------------------------- | --------- | -------------------------------------------- |
| Users can view own generations    | SELECT    | `auth.uid() = user_id`                       |
| Users can insert own generations  | INSERT    | `auth.uid() = user_id`                       |
| Users can update own generations  | UPDATE    | `auth.uid() = user_id AND locked_by IS NULL` |
| Users can delete own generations  | DELETE    | `auth.uid() = user_id`                       |
| Admins can view all generations   | SELECT    | `is_admin()`                                 |
| Admins can update all generations | UPDATE    | `is_admin()`                                 |

## 9.5 Enforcement Points

| Layer                  | Enforcement                      |
| ---------------------- | -------------------------------- |
| **Middleware**         | Session refresh (not auth check) |
| **AuthGuard (Client)** | Route protection, redirects      |
| **API Routes**         | `supabase.auth.getUser()` check  |
| **Database**           | RLS policies on every query      |

## 9.6 Security Implications

### Strengths

- RLS provides defense-in-depth at the database layer
- No client-side API key exposure (proxy pattern)
- Session cookies are HTTP-only (via Supabase SSR)
- Admin functions use `is_admin()` database function

### Weaknesses

- Profile creation trigger has permissive policy (`WITH CHECK (true)`)
- Budget check happens client-side before generation (could be bypassed)
- No rate limiting on API routes

---

# 10. End-to-End Application Workflow

## 10.1 User Signup/Login Flow

### Narrative Walkthrough

1. **User Visits `/login`**: The login page presents two options: Google OAuth and Email/Password.

2. **User Clicks "Sign in with Google"**:
   - `signInWithGoogle()` calls Supabase OAuth
   - User redirected to Google consent screen
   - After consent, Google redirects to `/auth/callback`

3. **Callback Processing**:
   - Supabase exchanges authorization code for tokens
   - Session stored in cookies
   - `on_auth_user_created` trigger fires (if new user)
   - Profile record created with `credits: 0` and `role: 'user'`

4. **Profile Fetch**:
   - `AuthProvider` detects session change
   - `fetchProfile()` retrieves profile from Supabase
   - If no profile exists (edge case), creates one via REST API

5. **User Lands on Dashboard**:
   - `AuthGuard` confirms user is authenticated
   - Header displays user info and budget ($0.00 remaining)

6. **Admin Sets Budget** (Out-of-band):
   - Admin navigates to `/users`
   - Finds user, clicks edit budget
   - Sets `credits` (e.g., 10000 = $100.00)
   - User can now generate content

## 10.2 Core Feature: Content Generation

### Narrative Walkthrough

1. **User Navigates to `/editor`**:
   - Page loads with input form
   - Previous state restored from localStorage (if any)

2. **User Fills Form**:
   - Topic: "Introduction to Machine Learning"
   - Subtopics: "Supervised Learning\nUnsupervised Learning\nNeural Networks"
   - Mode: "lecture"
   - (Optional) Uploads transcript.txt

3. **User Clicks "Create Content"**:
   - `startGeneration()` called in `useGeneration`
   - Budget check via Supabase query
   - If budget exhausted, error displayed and generation blocked

4. **Orchestrator Initialized**:
   - `new Orchestrator(apiKey)` creates all agent instances
   - `orchestrator.generate(params, signal)` returns async generator

5. **Phase 0: Parallel Analysis**:

   ```
   ┌─────────────────────────────────────┐
   │ CourseDetector         Analyzer     │
   │ (detect domain)   (gap analysis)    │
   │ ~4 seconds each, run in parallel    │
   └─────────────────────────────────────┘
   ```

   - CourseDetector: Identifies "machine-learning" domain with 95% confidence
   - Analyzer: Finds 2 subtopics covered, 1 not covered in transcript

6. **Phase 1: Content Creation**:
   - Creator agent receives:
     - Topic + subtopics
     - Transcript (if provided)
     - Gap analysis results
     - Course context
   - Streams content chunks via SSE
   - UI updates in real-time (~60 seconds)

7. **Phase 2: Sanitization** (if transcript):
   - Sanitizer compares content against transcript
   - Removes contradictions, preserves formatting
   - ~10 seconds

8. **Phase 3: Quality Loop**:

   ```
   Loop 1:
     Reviewer: Score 7/10, issues: "AI phrases, missing example"
     Refiner: Applies search/replace patches
   Loop 2:
     Reviewer: Score 9/10, passes threshold
     Exit loop
   ```

9. **Phase 4: Formatting** (assignment mode only):
   - Formatter converts to JSON structure
   - AssignmentSanitizer validates questions
   - Replaces invalid questions with new ones

10. **Completion**:
    - `complete` event emitted with final content and cost
    - Content saved to Supabase via `saveGeneration()`
    - UI shows "Saved to cloud successfully"
    - Total cost: ~$0.0234

11. **User Reviews Content**:
    - Markdown preview shows formatted notes
    - Can edit in Monaco editor
    - Can export to PDF or Markdown file
    - Can save changes manually

## 10.3 Data Flow: Creation → Processing → Persistence → Retrieval

```
INPUT                    PROCESSING                    PERSISTENCE
┌─────────────┐         ┌───────────────────────────┐ ┌────────────────┐
│ User Input  │         │  Multi-Agent Pipeline     │ │  Supabase      │
│             │         │                           │ │                │
│ - topic     │ ──────► │  CourseDetector ──────────┤ │  generations   │
│ - subtopics │         │  Analyzer ────────────────┤ │  table         │
│ - mode      │         │  Creator (streaming) ─────┤ │                │
│ - transcript│         │  Sanitizer ───────────────┤ │  ┌───────────┐ │
└─────────────┘         │  Reviewer ◄───────────────┤ │  │final_     │ │
                        │  Refiner ─────────────────┤ │  │content    │ │
                        │  Formatter ───────────────┤ │  │gap_       │ │
                        └───────────────────────────┘ │  │analysis   │ │
                                    │                 │  │estimated_ │ │
                                    │                 │  │cost       │ │
                                    ▼                 │  └───────────┘ │
                        ┌───────────────────────────┐ │                │
                        │  Zustand Store            │ │                │
                        │  (client-side)            │ │                │
                        │                           │ │                │
                        │  - Real-time updates      │ │                │
                        │  - localStorage persist   │ │                │
                        └───────────────────────────┘ │                │
                                    │                 └────────────────┘
                                    │
                                    ▼
RETRIEVAL              ┌───────────────────────────┐
                       │  Archives Page            │
┌─────────────────────►│                           │
│                      │  SELECT * FROM generations│
│                      │  WHERE user_id = auth.uid()│
│                      │  ORDER BY created_at DESC │
│                      │                           │
│  User clicks         │  Display: topic, mode,    │
│  "View Archives"     │  status, cost, timestamp  │
│                      │                           │
│                      │  User can:                │
│                      │  - View in editor         │
│                      │  - Delete                 │
│                      │  - Restore to editor      │
└──────────────────────┴───────────────────────────┘
```

## 10.4 Error and Edge Cases

### Budget Exhausted

```
User clicks "Create Content"
         │
         ▼
checkBudget() → { allowed: false, remaining: -0.02 }
         │
         ▼
Error displayed: "Budget exhausted! You have $-0.02 remaining."
Generation blocked
```

### Transcript Mismatch

```
Analyzer returns:
  covered: []
  notCovered: []
  partiallyCovered: []
         │
         ▼
Orchestrator detects 0 coverage
         │
         ▼
Yields: { type: 'mismatch_stop', message: '...' }
         │
         ▼
Generation halted, user informed
```

### Network Error During Streaming

```
XAIClient.stream() throws
         │
         ▼
withRetry() catches error
         │
         ├─► 429/5xx: Exponential backoff, retry
         │
         └─► Other: Propagate error
                    │
                    ▼
         useGeneration catches, sets error state
                    │
                    ▼
         UI shows error message, allows retry
```

---

# 11. Feature Inventory

## 11.1 Complete Feature List

| Feature                  | Frontend | Backend           | Status  | Dependencies            |
| ------------------------ | -------- | ----------------- | ------- | ----------------------- |
| **Authentication**       |          |                   |         |                         |
| Google OAuth             | ✓        | Supabase Auth     | Stable  | Supabase project config |
| Email/Password           | ✓        | Supabase Auth     | Stable  | SMTP setup (optional)   |
| Session persistence      | ✓        | Middleware        | Stable  | @supabase/ssr           |
| **Content Generation**   |          |                   |         |                         |
| Lecture notes            | ✓        | Orchestrator      | Stable  | Claude API              |
| Assignments              | ✓        | Orchestrator      | Stable  | Claude API              |
| Pre-reading materials    | ✓        | Orchestrator      | Stable  | Claude API              |
| Transcript analysis      | ✓        | Analyzer agent    | Stable  | Claude Haiku            |
| Gap analysis display     | ✓        | -                 | Stable  | -                       |
| Domain detection         | ✓        | CourseDetector    | Stable  | Claude Haiku            |
| Quality review loop      | -        | Reviewer/Refiner  | Stable  | Claude Sonnet           |
| **Content Rendering**    |          |                   |         |                         |
| Markdown rendering       | ✓        | -                 | Stable  | react-markdown, rehype  |
| LaTeX math               | ✓        | -                 | Stable  | KaTeX                   |
| Code highlighting        | ✓        | -                 | Stable  | highlight.js            |
| Mermaid diagrams         | ✓        | -                 | Stable  | mermaid                 |
| XSS protection           | ✓        | -                 | Stable  | rehype-sanitize         |
| **Export**               |          |                   |         |                         |
| Markdown download        | ✓        | -                 | Stable  | -                       |
| PDF export               | ✓        | -                 | Stable  | Browser print API       |
| CSV export (assignments) | ✓        | -                 | Stable  | -                       |
| **Storage**              |          |                   |         |                         |
| Cloud save               | ✓        | Supabase          | Stable  | RLS policies            |
| Auto-save on complete    | ✓        | persistence.ts    | Stable  | -                       |
| Manual save              | ✓        | persistence.ts    | Stable  | -                       |
| Local persistence        | ✓        | Zustand persist   | Stable  | localStorage            |
| **Admin Features**       |          |                   |         |                         |
| User management          | ✓        | RLS policies      | Stable  | Admin role              |
| Budget management        | ✓        | profiles table    | Stable  | Admin role              |
| View all generations     | ✓        | RLS policies      | Stable  | Admin role              |
| **Caching**              |          |                   |         |                         |
| Gap analysis cache       | -        | cache.ts          | Stable  | -                       |
| Course context cache     | -        | cache.ts          | Stable  | -                       |
| Semantic cache           | -        | semantic-cache.ts | Partial | No embeddings API       |
| **Observability**        |          |                   |         |                         |
| Generation stepper       | ✓        | -                 | Stable  | -                       |
| Cost tracking            | ✓        | token-counter.ts  | Stable  | -                       |
| Metrics dashboard        | ✓        | -                 | Partial | -                       |

## 11.2 Feature Maturity Assessment

### Stable Features

- Core content generation (all 3 modes)
- Authentication flow
- Cloud persistence
- Basic caching
- Cost estimation

### Partial/Experimental Features

| Feature                  | Current State             | Missing                      |
| ------------------------ | ------------------------- | ---------------------------- |
| Semantic caching         | Implementation exists     | No embedding API integration |
| Metrics dashboard        | UI exists                 | Limited data population      |
| Edge Function generation | File exists               | Not connected to client flow |
| Real-time updates        | Supabase Realtime enabled | Not used by UI               |
| Checkpoints              | Table exists              | Not populated                |

---

# 12. Configuration & Environment Management

## 12.1 Environment Variables

### Required Variables

| Variable                        | Purpose                | Where Used      |
| ------------------------------- | ---------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL   | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client + Server |
| `XAI_API_KEY`                   | xAI Grok API key       | Server only     |

### Optional Variables

| Variable                        | Purpose                | Default                              |
| ------------------------------- | ---------------------- | ------------------------------------ |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | Legacy client-side key | None (deprecated)                    |
| `NEXT_PUBLIC_*`                 | Exposed to client      | Expected (Supabase anon key has RLS) |
| `XAI_API_KEY`                   | Never exposed          | Server-only, API proxy pattern       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Critical               | Server-only, used sparingly          |

## 12.2 Configuration Files

### `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // For static export compatibility
  },
};
```

**Notable:** `output: "export"` is commented out, indicating server features are required.

### `tsconfig.json`

- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Excludes: `node_modules`, `supabase`

### `tailwind.config.ts`

- Content paths configured for `./src/**/*.{ts,tsx}`
- Typography plugin enabled
- Forms plugin enabled

### `eslint.config.mjs`

- Extends `eslint-config-next`
- Standard Next.js linting rules

## 12.3 Secrets Handling

| Secret         | Storage               | Access Pattern         |
| -------------- | --------------------- | ---------------------- |
| API Keys       | Environment variables | `process.env.VARIABLE` |
| Session Tokens | HTTP-only cookies     | Supabase SSR handles   |
| User Passwords | Supabase Auth         | Never accessed by app  |

## 12.4 Environment Differences

### Development

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
XAI_API_KEY=<your-xai-api-key>

# Optional (deprecated, only for legacy support)
# NEXT_PUBLIC_ANTHROPIC_API_KEY=<legacy-key>
```

**xAI Grok Pricing (approximate):**

- Input: $0.20 per million tokens
- Output: $0.50 per million tokens
- Model: `grok-4-1-fast-reasoning-latest`

### Production (Inferred)

- Same variables, different values
- Supabase URL points to production project
- Production xAI API key with higher rate limits
- No indication of staging environment

---

# 13. Build, Run, and Deployment

## 13.1 Build Process

### Commands

```bash
npm run dev    # Development server (hot reload)
npm run build  # Production build
npm run start  # Production server
npm run lint   # ESLint check
```

### Build Output

Next.js compiles to `.next/` directory:

- Server components compiled to Node.js
- Client components bundled with Webpack
- Static assets optimized
- API routes compiled as serverless functions

## 13.2 Local Development

### Prerequisites

1. Node.js (version compatible with Next.js 16)
2. npm or pnpm
3. Supabase project (or local Supabase via Docker)
4. Anthropic API key

### Setup Steps

```bash
# 1. Clone and install
cd GCCP
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Run migrations (if using local Supabase)
supabase db push

# 4. Start development server
npm run dev
```

### Local Supabase (Optional)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Access local dashboard
open http://localhost:54323
```

## 13.3 Deployment

### Recommended Platform: Vercel

**Rationale:**

- Native Next.js support
- Automatic serverless function deployment
- Environment variable management
- Edge network for global performance

### Deployment Steps (Vercel)

1. Connect GitHub repository
2. Configure environment variables in Vercel dashboard
3. Deploy (automatic on push to main)

### Alternative Platforms

| Platform    | Considerations                                |
| ----------- | --------------------------------------------- |
| Railway     | Full server support, good for background jobs |
| Render      | Free tier available                           |
| Self-hosted | Requires Node.js server, Docker optional      |

### Build-Time Considerations

- Supabase credentials must be available at build time
- `output: "export"` is disabled (server features required)
- API routes compile to serverless functions

## 13.4 Runtime Dependencies

### Server Runtime

- Node.js (LTS recommended)
- Environment variables configured
- Network access to:
  - Supabase API
  - Anthropic API

### Client Runtime

- Modern browser (ES2017+ support)
- JavaScript enabled
- Cookies enabled (for authentication)

---

# 14. Observability & Error Handling

## 14.1 Logging Strategy

### Log Levels

| Level | Use Case              | Console Method  |
| ----- | --------------------- | --------------- |
| debug | Development debugging | `console.debug` |
| info  | Normal operations     | `console.info`  |
| warn  | Potential issues      | `console.warn`  |
| error | Actual errors         | `console.error` |

### Logger Implementation (`lib/utils/logger.ts`)

```typescript
// Structured logging with context
logger.info("Agent completed", {
  agent: "Creator",
  duration: 42000,
  cost: 0.0123,
});

// Async timing helper
await logger.time(
  "API call",
  async () => {
    return await fetchData();
  },
  { agent: "Analyzer" },
);
```

### Environment-Aware Logging (`lib/utils/env-logger.ts`)

Different log instances for different contexts:

- `generationLog` - Generation pipeline events
- `authLog` - Authentication events
- `storeLog` - Zustand store operations

### Log Storage

- **Development:** Console only
- **Production:** Console (Vercel captures)
- **Database:** `generation_logs` table (partially populated)

## 14.2 Error Propagation

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ERROR PROPAGATION FLOW                             │
│                                                                         │
│  ┌─────────────────┐                                                   │
│  │ Anthropic API   │ ──► Error Response (429, 500, etc.)               │
│  └─────────────────┘          │                                        │
│                               ▼                                        │
│  ┌─────────────────┐   ┌─────────────────────────────────────┐         │
│  │ AnthropicClient │   │ withRetry()                         │         │
│  │                 │   │ - 429/5xx: Retry with backoff       │         │
│  │                 │   │ - Other: Throw immediately          │         │
│  └─────────────────┘   └──────────────┬──────────────────────┘         │
│                                       │                                │
│                                       ▼                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Agent (Creator, Reviewer, etc.)                                 │   │
│  │ - JSON parse errors: Return fallback + log                      │   │
│  │ - API errors: Let propagate                                     │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│                                  ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Orchestrator                                                    │   │
│  │ - AbortError: Yield 'Aborted' and return                       │   │
│  │ - Other: Yield { type: 'error', message }                      │   │
│  │ - Quality gate failure: Log and continue                        │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│                                  ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ useGeneration Hook                                              │   │
│  │ - AbortError: Set status 'idle', log warning                   │   │
│  │ - Other: Set error state, set status 'error'                   │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│                                  ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ UI Component                                                    │   │
│  │ - Display error message to user                                 │   │
│  │ - ErrorBoundary catches render errors                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## 14.3 Monitoring Hooks

### Current Implementation

| Metric          | Collection Point            | Storage            |
| --------------- | --------------------------- | ------------------ |
| Generation cost | Orchestrator complete event | Zustand + Supabase |
| Agent duration  | Each agent call             | Console log        |
| Cache hit rate  | cache.ts/semantic-cache.ts  | In-memory          |
| Budget usage    | Header component            | Supabase query     |

### Missing Monitoring

- No APM integration (e.g., Sentry, DataDog)
- No custom metrics endpoint
- No alerting system
- No request tracing

## 14.4 Debuggability

### Debug Endpoints

| Endpoint              | Purpose                        |
| --------------------- | ------------------------------ |
| `/api/debug/profile`  | Inspect current user's profile |
| `/api/debug/supabase` | Test Supabase connection       |

### Debug Console Logs

- `[Auth]` prefix for authentication events
- `[Persistence]` prefix for save operations
- `[Admin]` prefix for admin operations
- Emoji indicators (📦 cache, 🧠 semantic, ✅ success, ❌ error)

### Store DevTools

Zustand supports Redux DevTools extension:

```typescript
// Enable in development
import { devtools } from "zustand/middleware";
```

---

# 15. Code Quality & Maintainability Review

## 15.1 Code Organization Assessment

### Strengths

| Aspect                     | Assessment                                   |
| -------------------------- | -------------------------------------------- |
| **Separation of Concerns** | Clear boundaries between agents, UI, storage |
| **Type Safety**            | Comprehensive TypeScript types               |
| **Module Cohesion**        | Related code grouped logically               |
| **Path Aliases**           | `@/*` import paths for cleaner imports       |

### Weaknesses

| Aspect               | Issue                                           | Impact            |
| -------------------- | ----------------------------------------------- | ----------------- |
| **Prompt Size**      | `creator/index.ts` is 1100+ lines               | Hard to maintain  |
| **Hook Coupling**    | `useGeneration` tightly coupled to Orchestrator | Testing difficult |
| **Agent Similarity** | Repeated patterns across agents                 | Could be more DRY |

## 15.2 Naming Consistency

### Consistent Patterns

- Components: PascalCase (`SafeMarkdown`, `AuthGuard`)
- Hooks: camelCase with `use` prefix (`useGeneration`, `useAuth`)
- Files: kebab-case (`base-agent.ts`, `token-counter.ts`)
- Types: PascalCase (`GapAnalysisResult`, `CourseContext`)

### Inconsistencies

| Location                            | Issue                                    |
| ----------------------------------- | ---------------------------------------- |
| `temp-app` in package.json          | Generic name, should be `gccp`           |
| `profiles!generations_user_id_fkey` | Supabase-specific syntax leaks into code |

## 15.3 Abstraction Quality

### Well-Abstracted

| Abstraction       | Quality   | Reason                                   |
| ----------------- | --------- | ---------------------------------------- |
| `BaseAgent`       | Good      | Common interface for all agents          |
| `AnthropicClient` | Good      | Encapsulates retry logic, proxy decision |
| `SafeMarkdown`    | Excellent | Comprehensive content preprocessing      |
| `Orchestrator`    | Good      | Single entry point for generation        |

### Needs Improvement

| Abstraction        | Issue                     | Suggestion                  |
| ------------------ | ------------------------- | --------------------------- |
| `persistence.ts`   | REST API calls duplicated | Use Supabase client wrapper |
| Model selection    | Hardcoded per agent       | Extract to configuration    |
| Quality thresholds | Magic numbers (9, 8)      | Extract to constants        |

## 15.4 Reusability Analysis

### Highly Reusable

- `SafeMarkdown` - General-purpose markdown renderer
- `cache.ts` / `semantic-cache.ts` - Framework-agnostic caching
- `quality-gate.ts` - LLM output validation
- `token-counter.ts` - Cost calculation

### Application-Specific

- All agents (tied to this domain)
- Prompts (highly specific to use case)
- Database schema (specific to this application)

## 15.5 Testability Assessment

### Testing Infrastructure

**Current State:** No test files found. No testing frameworks configured.

### Testability Analysis

| Component                    | Testability | Blockers                            |
| ---------------------------- | ----------- | ----------------------------------- |
| Agents                       | Medium      | Requires mocking Anthropic client   |
| Orchestrator                 | Low         | Many dependencies, async generators |
| UI Components                | Medium      | Requires store/auth mocking         |
| Utils (cache, token-counter) | High        | Pure functions, no dependencies     |
| API Routes                   | Medium      | Requires request mocking            |

### Recommended Testing Strategy

1. **Unit Tests:** Utils, token counter, cache logic
2. **Integration Tests:** Agent pipeline with mocked LLM
3. **E2E Tests:** Critical user flows with Playwright/Cypress

## 15.6 Dead Code / Duplication

### Potential Dead Code

| Location                              | Status     | Evidence                   |
| ------------------------------------- | ---------- | -------------------------- |
| `supabase/functions/generate-content` | Unused     | Not invoked successfully   |
| `checkpoints` table                   | Unused     | Never populated            |
| `locked_by` column                    | Unused     | Never set                  |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY`       | Deprecated | Proxy pattern used instead |

### Duplication

| Pattern                | Locations                                 | Suggestion               |
| ---------------------- | ----------------------------------------- | ------------------------ |
| Supabase REST calls    | `useAuth.tsx`, `persistence.ts`, archives | Extract to utility       |
| Agent prompt structure | All agent files                           | Extract template utility |
| Error handling pattern | Multiple locations                        | Extract error handler    |

---

# 16. Performance Considerations

## 16.1 Known Bottlenecks

### LLM Latency

| Agent            | Average Duration | Cause                      |
| ---------------- | ---------------- | -------------------------- |
| Creator          | ~60 seconds      | Large content generation   |
| Reviewer/Refiner | ~10 seconds each | Quality loop iterations    |
| Total Pipeline   | ~6 minutes       | Sequential agent execution |

### Mitigation Strategies (Implemented)

- Parallel execution: CourseDetector + Analyzer
- Streaming: Creator content appears incrementally
- Caching: Gap analysis, course context cached

### Mitigation Strategies (Recommended in AGENTIC_ENHANCEMENTS.md)

- Model routing: Use Haiku for simple tasks
- Semantic caching: 30-60% cost reduction potential
- Context pruning: Reduce token bloat

## 16.2 Inefficient Patterns

| Pattern                 | Location         | Issue                           | Impact                                |
| ----------------------- | ---------------- | ------------------------------- | ------------------------------------- |
| Full content in refiner | Orchestrator     | Entire content + feedback       | Token bloat                           |
| Regex in loop           | SafeMarkdown.tsx | Multiple pattern replacements   | CPU on large docs                     |
| Profile fetch           | useAuth.tsx      | REST call with timeout fallback | Complexity, latency                   |
| Budget check            | useGeneration.ts | Single query with spent_credits | Efficient (legacy fallback available) |

## 16.3 Scalability Limits

### Vertical Scaling Limits

| Resource                | Limit                   | Consequence                  |
| ----------------------- | ----------------------- | ---------------------------- |
| Vercel function timeout | 10s (hobby) / 60s (pro) | Long generations may timeout |
| Anthropic rate limits   | Varies by tier          | Concurrent users limited     |
| Supabase connections    | 20 (free) / 100+ (paid) | Connection pool exhaustion   |

### Horizontal Scaling Considerations

| Component       | Scales? | Notes                        |
| --------------- | ------- | ---------------------------- |
| Next.js app     | Yes     | Vercel handles automatically |
| Supabase        | Yes     | Managed service              |
| In-memory cache | No      | Per-instance, not shared     |

## 16.4 Caching Analysis

### Current Caching

| Cache          | Type             | TTL          | Hit Rate Target        |
| -------------- | ---------------- | ------------ | ---------------------- |
| Gap analysis   | Hash-based       | 2 hours      | N/A (exact match)      |
| Course context | Semantic-based   | 2 hours      | ~60% (similar domains) |
| Semantic cache | Similarity-based | Configurable | >25% (per framework)   |

**Semantic Cache Features:**

- Vector embeddings with cosine similarity matching
- Simple statistical embeddings (character/word/bigram-based)
- Configurable similarity thresholds (default: 0.85)
- Volatility-based TTL (high: 5min, medium: 30min, low: 2hr, static: 24hr)
- LRU eviction when max entries reached
- Metrics tracking (hits/misses/searches)

**Production Note:** Current implementation uses zero-cost statistical embeddings. For improved accuracy, consider OpenAI `text-embedding-3-small` (~$0.00002/query, breaks even at 2.5% hit rate).
| Budget remaining | No | Yes (with short TTL) |

---

# 17. Security Analysis

## 17.1 Attack Surface Analysis

### Authentication Attacks

| Vector            | Risk   | Mitigation                          |
| ----------------- | ------ | ----------------------------------- |
| Session hijacking | Medium | HTTP-only cookies, Supabase handles |
| OAuth token theft | Low    | Server-side token exchange          |
| Brute force login | Medium | No rate limiting on login endpoint  |

### API Attacks

| Vector                  | Risk   | Mitigation                         |
| ----------------------- | ------ | ---------------------------------- |
| Unauthorized API access | Low    | Auth check in all API routes       |
| API key exposure        | Low    | Server-side only, proxy pattern    |
| Rate limit bypass       | Medium | No application-level rate limiting |

### Data Attacks

| Vector          | Risk     | Mitigation                          |
| --------------- | -------- | ----------------------------------- |
| SQL injection   | Very Low | Supabase client, RLS                |
| XSS via content | Low      | rehype-sanitize, DOMPurify patterns |
| Data leakage    | Low      | RLS policies                        |

## 17.2 Input Validation Gaps

| Input             | Validation                 | Gap                    |
| ----------------- | -------------------------- | ---------------------- |
| Topic/Subtopics   | Length only (implicit)     | No max length enforced |
| Transcript        | File type (.txt implied)   | No validation          |
| Assignment counts | Implicit number conversion | No min/max validation  |
| Mode              | Enum validation            | Type-safe, good        |

## 17.3 Authentication Weaknesses

| Weakness                | Risk Level | Description                         |
| ----------------------- | ---------- | ----------------------------------- |
| No 2FA                  | Low        | Supabase Auth supports, not enabled |
| No session invalidation | Low        | Can't force logout other sessions   |
| Liberal profile policy  | Medium     | `WITH CHECK (true)` for trigger     |

## 17.4 Data Exposure Risks

| Data              | Exposure Risk | Notes                    |
| ----------------- | ------------- | ------------------------ |
| User email        | Internal only | Displayed in admin panel |
| Generated content | User-scoped   | RLS enforced             |
| Cost data         | User-scoped   | RLS enforced             |
| API keys          | None          | Server-side only         |

## 17.5 Dependency Risks

### Critical Dependencies

| Package                 | Risk | Notes                         |
| ----------------------- | ---- | ----------------------------- |
| `@anthropic-ai/sdk`     | Low  | Official SDK, well-maintained |
| `@supabase/supabase-js` | Low  | Official SDK                  |
| `rehype-sanitize`       | Low  | Active XSS prevention         |

### Potential Concerns

| Package             | Concern                                         |
| ------------------- | ----------------------------------------------- |
| `mermaid`           | Complex parsing, potential XSS if misconfigured |
| `lodash`            | Prototype pollution in older versions           |
| Multiple `rehype-*` | Many dependencies, supply chain risk            |

---

# 18. Known Flaws, Risks & Technical Debt

## 18.1 Bugs / Suspicious Logic

| Location             | Issue                           | Severity                                   |
| -------------------- | ------------------------------- | ------------------------------------------ |
| `persistence.ts`     | Duplicate check only on retry   | Low - May save duplicates on first attempt |
| `useAuth.tsx`        | Complex fallback chain          | Medium - Hard to debug                     |
| `applySearchReplace` | Warns but continues on no match | Low - May produce unexpected output        |

## 18.2 Anti-Patterns

| Pattern               | Location                       | Issue                     |
| --------------------- | ------------------------------ | ------------------------- |
| Magic numbers         | Orchestrator (9, 8 thresholds) | Should be constants       |
| Direct REST calls     | Multiple locations             | Should use client wrapper |
| `any` types           | Agent parseLLMJson returns     | Type safety compromised   |
| Circular dependencies | Potential in hooks/store       | Not detected but possible |

## 18.3 Hard-Coded Values

| Value              | Location               | Should Be           |
| ------------------ | ---------------------- | ------------------- |
| Model names        | Each agent constructor | Configuration       |
| Quality thresholds | Orchestrator (9, 8)    | Constants or config |
| Max retry attempts | Multiple (3)           | Constant            |
| Cache TTL          | cache.ts (2 hours)     | Configuration       |
| Content max length | persistence.ts (500KB) | Configuration       |

## 18.4 Scalability Blockers

| Blocker                | Impact                            | Solution             |
| ---------------------- | --------------------------------- | -------------------- |
| In-memory caching      | Cache not shared across instances | Redis/external cache |
| Synchronous generation | Ties up serverless function       | Background jobs      |
| No queue system        | Can't handle bursts               | Add job queue        |

## 18.5 Maintainability Risks

| Risk               | Description                     | Mitigation           |
| ------------------ | ------------------------------- | -------------------- |
| Prompt maintenance | 1100+ lines, changes risky      | Split into modules   |
| No tests           | Changes may break functionality | Add test suite       |
| Coupled hooks      | Hard to refactor                | Dependency injection |
| Tribal knowledge   | Complex flows undocumented      | This documentation   |

## 18.6 Backward Compatibility Notes

### Budget Tracking (`spent_credits`)

The system uses a `spent_credits` column in the `profiles` table to track user spending independently of generation records. This ensures that deleting generations does not artificially increase available budget.

**Backward Compatibility:**

- If the `spent_credits` column doesn't exist (migration not applied), the system falls back to the legacy method of calculating spent budget from the `generations` table
- The fallback is automatic and transparent to users
- Migration `20260203000001_add_spent_credits.sql` initializes `spent_credits` from existing generation costs

**Components with fallback logic:**

- `useGeneration.ts` → `checkBudget()` and `checkBudgetLegacy()`
- `Header.tsx` → Uses `spent_credits ?? 0`
- `users/page.tsx` → `getUserTotalSpent()` checks for column existence

---

# 19. Missing Pieces & Assumptions

## 19.1 Unimplemented Features

| Feature                   | Evidence                   | Status         |
| ------------------------- | -------------------------- | -------------- |
| Edge Function generation  | File exists, not connected | Incomplete     |
| Checkpoints/Resume        | Table exists, not used     | Incomplete     |
| Generation locking        | Column exists, not used    | Incomplete     |
| Semantic cache embeddings | Code exists, no API        | Incomplete     |
| Real-time UI updates      | Realtime enabled           | Not used in UI |

## 19.2 Missing Documentation

| Documentation         | Expected Location  | Status                    |
| --------------------- | ------------------ | ------------------------- |
| API documentation     | OpenAPI spec       | Missing                   |
| Deployment guide      | README or separate | Basic only                |
| Environment setup     | .env.example       | Missing                   |
| Contribution guide    | CONTRIBUTING.md    | Missing                   |
| Architecture diagrams | docs/ folder       | Missing (now in this doc) |

## 19.3 Missing Tests

| Test Type         | Coverage | Priority |
| ----------------- | -------- | -------- |
| Unit tests        | 0%       | High     |
| Integration tests | 0%       | High     |
| E2E tests         | 0%       | Medium   |
| Performance tests | 0%       | Low      |

## 19.4 Infrastructure Assumptions

| Assumption         | Evidence             | Risk if Wrong                    |
| ------------------ | -------------------- | -------------------------------- |
| Vercel deployment  | next.config comments | Need reconfigure for other hosts |
| Single region      | No region config     | Latency for global users         |
| Supabase managed   | No self-host config  | Migration effort if needed       |
| Single environment | No staging config    | No pre-prod testing              |

---

# 20. Future Improvement Opportunities

## 20.1 Architectural Improvements

| Improvement                  | Benefit                             | Effort    |
| ---------------------------- | ----------------------------------- | --------- |
| Background job processing    | Reliability, user can close browser | High      |
| Message queue (e.g., BullMQ) | Handle concurrent generations       | Medium    |
| External caching (Redis)     | Shared cache across instances       | Medium    |
| Microservices split          | Independent scaling                 | Very High |

## 20.2 Recommended Refactors

| Refactor             | Current               | Proposed                    | Benefit           |
| -------------------- | --------------------- | --------------------------- | ----------------- |
| Prompt organization  | Single 1100-line file | Multiple modules by section | Maintainability   |
| Configuration system | Hard-coded values     | Config file + env           | Flexibility       |
| Model routing        | Per-agent hardcoded   | Dynamic selection           | Cost optimization |
| Hook decomposition   | Large useGeneration   | Smaller focused hooks       | Testability       |

## 20.3 Feature Expansions

| Feature                | Description                            | Value              |
| ---------------------- | -------------------------------------- | ------------------ |
| Multi-language support | Generate content in multiple languages | Broader audience   |
| Version history        | Track changes to generations           | Content management |
| Collaboration          | Multiple users edit content            | Team workflows     |
| Custom prompts         | User-defined prompt templates          | Flexibility        |
| Analytics dashboard    | Usage patterns, popular topics         | Business insights  |

## 20.4 Tooling Upgrades

| Tool           | Current      | Proposed                 | Benefit               |
| -------------- | ------------ | ------------------------ | --------------------- |
| Testing        | None         | Vitest + Playwright      | Quality assurance     |
| Error tracking | Console logs | Sentry                   | Production visibility |
| CI/CD          | None visible | GitHub Actions           | Automated quality     |
| Documentation  | Manual       | Storybook for components | Component library     |

---

# 21. Appendix

## 21.1 Glossary of Internal Terms

| Term               | Definition                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Agent**          | A specialized AI module that performs a specific task (e.g., Creator, Reviewer)              |
| **Orchestrator**   | The coordinator that manages the sequential execution of agents                              |
| **Gap Analysis**   | The process of comparing transcript content against requested subtopics                      |
| **Course Context** | Automatically detected domain information used to tailor content                             |
| **Quality Loop**   | The iterative Reviewer → Refiner cycle that improves content                                 |
| **Generation**     | A single content creation job with its inputs, outputs, and metadata                         |
| **Credits**        | User budget stored in cents (100 credits = $1.00). Allocated by admins.                      |
| **Spent Credits**  | Total credits consumed by user, stored in cents. Persists even when generations are deleted. |
| **Sanitizer**      | Agent that fact-checks content against transcript                                            |
| **Formatter**      | Agent that converts content to structured JSON (assignments)                                 |

## 21.2 Acronyms

| Acronym | Meaning                                                          |
| ------- | ---------------------------------------------------------------- |
| GCCP    | (Internal name for the platform, meaning not explicitly defined) |
| MCSC    | Multiple Choice Single Correct                                   |
| MCMC    | Multiple Choice Multiple Correct                                 |
| RLS     | Row Level Security                                               |
| SSE     | Server-Sent Events                                               |
| TTL     | Time To Live (cache expiration)                                  |
| LLM     | Large Language Model                                             |

## 21.3 File Cross-References

### Entry Points

| Purpose     | File                          |
| ----------- | ----------------------------- |
| App entry   | `src/app/layout.tsx`          |
| Main page   | `src/app/page.tsx`            |
| Editor page | `src/app/editor/page.tsx`     |
| API proxy   | `src/app/api/stream/route.ts` |

### Core Logic

| Purpose         | File                             |
| --------------- | -------------------------------- |
| Generation hook | `src/hooks/useGeneration.ts`     |
| Orchestrator    | `src/lib/agents/orchestrator.ts` |
| State store     | `src/lib/store/generation.ts`    |
| Prompts         | `src/prompts/creator/index.ts`   |

### Infrastructure

| Purpose          | File                                                          |
| ---------------- | ------------------------------------------------------------- |
| Auth context     | `src/hooks/useAuth.tsx`                                       |
| Supabase clients | `src/lib/supabase/*.ts`                                       |
| Database types   | `src/types/database.ts`                                       |
| Migration        | `supabase/migrations/20260202000000_recreate_full_schema.sql` |

## 21.4 Notable Code Excerpts

### Orchestrator Event Types

```typescript
// Event types yielded by orchestrator.generate()
yield { type: "step", agent, status, action, message };
yield { type: "chunk", content };
yield { type: "gap_analysis", content };
yield { type: "course_detected", content };
yield { type: "replace", content };
yield { type: "formatted", content };
yield { type: "complete", content, cost, metrics };
yield { type: "mismatch_stop", message, cost };
yield { type: "error", message };
```

### Quality Gate Thresholds

```typescript
// Progressive thresholds for quality loop
const qualityThreshold = loopCount === 1 ? 9 : 8;
const passesThreshold = review.score >= qualityThreshold;
```

### Model Pricing

```typescript
export const Pricing = {
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};
// Rates per million tokens
```

### Search/Replace Patch Format

```
<<<<<<< SEARCH
[Exact text to find - must match EXACTLY including whitespace]
=======
[Your improved replacement text]
>>>>>>>
```

---

## Document Metadata

**Primary Author:** Generated by Claude (Opus 4.5) based on complete codebase analysis  
**Review Status:** Unreviewed (single-pass generation)  
**Confidence Level:** High for architecture/code analysis, Medium for inferred business context  
**Limitations:** No access to deployment logs, production metrics, or team knowledge

---

_This document was generated as a comprehensive technical reference. It represents a point-in-time snapshot of the codebase as of February 2, 2026. Code changes after this date are not reflected._
