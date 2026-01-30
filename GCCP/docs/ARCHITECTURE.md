# GCCP Architecture Documentation

## Overview

The Generative Course Content Platform (GCCP) is a modern, cloud-native application built on a multi-agent AI architecture. It generates educational content through a sophisticated pipeline of specialized AI agents, with real-time progress tracking and robust error handling.

**Version:** 2.0.0  
**Last Updated:** 2026-01-30

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [Component Interactions](#component-interactions)
4. [Database Schema](#database-schema)
5. [Agent Architecture](#agent-architecture)
6. [Technology Stack](#technology-stack)

---

## System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js React App]
        Hooks[Custom Hooks]
        Store[Zustand Store]
    end

    subgraph "API Layer"
        NextAPI[Next.js API Routes]
        Generate[POST /api/generate]
        Export[POST /api/export/pdf]
        Retry[POST /api/retry]
        Stream[POST /api/stream]
    end

    subgraph "Edge Layer"
        EdgeFunc[Supabase Edge Function]
        Orchestrator[Generation Orchestrator]
    end

    subgraph "AI Agent Layer"
        CourseDet[Course Detector]
        Analyzer[Gap Analyzer]
        Creator[Content Creator]
        Sanitizer[Content Sanitizer]
        Reviewer[Quality Reviewer]
        Refiner[Content Refiner]
        Critic[Critic Agent]
        Formatter[Formatter]
    end

    subgraph "Data Layer"
        Supabase[(Supabase PostgreSQL)]
        Realtime[Realtime Subscriptions]
        Auth[Auth Service]
        Storage[File Storage]
    end

    subgraph "External Services"
        Anthropic[Anthropic Claude API]
        Puppeteer[PDF Generation]
    end

    UI --> Hooks
    Hooks --> Store
    Hooks --> NextAPI
    
    NextAPI --> Generate
    NextAPI --> Export
    NextAPI --> Retry
    NextAPI --> Stream
    
    Generate --> EdgeFunc
    Retry --> EdgeFunc
    
    EdgeFunc --> Orchestrator
    
    Orchestrator --> CourseDet
    Orchestrator --> Analyzer
    Orchestrator --> Creator
    Orchestrator --> Sanitizer
    Orchestrator --> Reviewer
    Orchestrator --> Refiner
    Orchestrator --> Critic
    Orchestrator --> Formatter
    
    CourseDet --> Anthropic
    Analyzer --> Anthropic
    Creator --> Anthropic
    Sanitizer --> Anthropic
    Reviewer --> Anthropic
    Refiner --> Anthropic
    Critic --> Anthropic
    Formatter --> Anthropic
    
    Orchestrator --> Supabase
    NextAPI --> Supabase
    
    Supabase --> Realtime
    Supabase --> Auth
    Supabase --> Storage
    
    Export --> Puppeteer
    
    Realtime -.-> UI
    Auth -.-> UI
```

### Architecture Layers

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Presentation** | Next.js 16, React 19, Tailwind CSS | UI rendering, user interactions |
| **State Management** | Zustand, TanStack Query | Client state, server state caching |
| **API** | Next.js API Routes | HTTP endpoints, request handling |
| **Edge Compute** | Supabase Edge Functions (Deno) | AI orchestration, background processing |
| **AI/ML** | Anthropic Claude API | Content generation, analysis |
| **Data** | Supabase PostgreSQL | Persistent storage, real-time subscriptions |
| **Auth** | Supabase Auth | User authentication, authorization |

---

## Data Flow

### Content Generation Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant API as /api/generate
    participant Edge as Edge Function
    participant DB as Supabase DB
    participant AI as Anthropic API
    participant RT as Realtime

    User->>UI: Enter topic, subtopics, mode
    UI->>API: POST /api/generate
    API->>DB: Create generation record
    API->>Edge: Invoke generate-content
    API->>UI: Return generation_id
    
    Edge->>DB: Update status: processing
    Edge->>RT: Broadcast: Initializing...
    
    par Course Detection
        Edge->>AI: Detect course context
        AI->>Edge: Return domain, confidence
        Edge->>DB: Save course_context
        Edge->>RT: Broadcast: 5% - Analyzing domain...
    and Gap Analysis (if transcript)
        Edge->>AI: Analyze transcript coverage
        AI->>Edge: Return covered/notCovered
        Edge->>DB: Save gap_analysis
        Edge->>RT: Broadcast: 10% - Checking coverage...
    end
    
    loop Review-Refine Cycle (max 3)
        Edge->>AI: Review content quality
        AI->>Edge: Return score, feedback
        Edge->>DB: Save feedback_scores
        Edge->>RT: Broadcast: Review iteration N
        
        alt Score < threshold
            Edge->>AI: Refine content
            AI->>Edge: Return improved content
            Edge->>DB: Save checkpoint
            Edge->>RT: Broadcast: Refining...
        end
    end
    
    Edge->>AI: Final polish
    AI->>Edge: Return polished content
    
    Edge->>AI: Critic evaluation
    AI->>Edge: Return quality scores
    Edge->>DB: Save feedback_scores
    
    Edge->>DB: Update status: completed
    Edge->>DB: Save final_content
    Edge->>RT: Broadcast: 100% - Complete!
    
    RT->>UI: Receive progress updates
    UI->>User: Display completed content
```

### PDF Export Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant API as /api/export/pdf
    participant PDF as Puppeteer
    participant FS as File System

    User->>UI: Click Export PDF
    UI->>API: POST /api/export/pdf
    Note over API: Markdown content
    
    API->>API: Convert MD to HTML
    API->>PDF: Launch browser
    PDF->>PDF: Render HTML
    PDF->>PDF: Generate PDF buffer
    PDF->>API: Return PDF bytes
    
    API->>UI: Return PDF (application/pdf)
    UI->>User: Trigger download
```

### Real-time Progress Flow

```mermaid
sequenceDiagram
    participant Client as React Client
    participant Supabase as Supabase Client
    participant RT as Realtime Channel
    participant DB as PostgreSQL
    participant Edge as Edge Function

    Client->>Supabase: subscribeToGeneration(id)
    Supabase->>RT: channel.on('postgres_changes')
    RT->>DB: LISTEN generation_updates
    
    loop Generation Progress
        Edge->>DB: UPDATE generations SET progress_percent=X
        DB->>RT: NOTIFY postgres_changes
        RT->>Supabase: Broadcast update
        Supabase->>Client: onData callback
        Client->>Client: Update progress UI
    end
```

---

## Component Interactions

### Frontend Components

```mermaid
graph TB
    subgraph "Pages"
        Login[Login Page]
        Editor[Editor Page]
        Archives[Archives Page]
        Users[Users Page]
    end

    subgraph "Editor Components"
        Workspace[AssignmentWorkspace]
        Stepper[GenerationStepper]
        View[AssignmentView]
        Diff[DiffViewer]
        Gap[GapAnalysis]
        Metrics[MetricsDashboard]
    end

    subgraph "Shared Components"
        Header[Header]
        Sidebar[Sidebar]
        AuthGuard[AuthGuard]
        ErrorBoundary[ErrorBoundary]
    end

    subgraph "Hooks"
        useGen[useGeneration]
        useAuth[useAuth]
        useAutoSave[useAutoSave]
        useSupabase[useSupabaseGeneration]
    end

    Login --> useAuth
    Editor --> Workspace
    Editor --> AuthGuard
    
    Workspace --> Stepper
    Workspace --> View
    Workspace --> Gap
    Workspace --> Metrics
    Workspace --> useGen
    Workspace --> useAutoSave
    
    View --> Diff
    
    Archives --> useAuth
    Users --> useAuth
    
    AuthGuard --> useAuth
    
    useGen --> useSupabase
```

### Agent Interactions

```mermaid
graph LR
    subgraph "Orchestrator"
        Main[Main Orchestrator]
        Progress[Progress Tracker]
        Resume[Resume Helper]
    end

    subgraph "Analysis Agents"
        CD[Course Detector]
        GA[Gap Analyzer]
    end

    subgraph "Generation Agents"
        CR[Creator]
        SN[Sanitizer]
    end

    subgraph "Quality Agents"
        RV[Reviewer]
        RF[Refiner]
        FC[Final Polish]
    end

    subgraph "Evaluation Agents"
        CT[Critic]
        FM[Formatter]
    end

    Main --> Progress
    Main --> Resume
    
    Main --> CD
    Main --> GA
    Main --> CR
    Main --> SN
    Main --> RV
    Main --> RF
    Main --> FC
    Main --> CT
    Main --> FM
    
    CD -->|Returns| Main
    GA -->|Returns| Main
    CR -->|Returns| Main
    SN -->|Returns| Main
    RV -->|Returns| Main
    RF -->|Returns| Main
    FC -->|Returns| Main
    CT -->|Returns| Main
    FM -->|Returns| Main
    
    Progress -->|Updates| Main
    Resume -->|Restores| Main
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        string email
        enum role
        int credits
        timestamp created_at
        timestamp updated_at
    }

    GENERATIONS {
        uuid id PK
        uuid user_id FK
        string topic
        string subtopics
        enum mode
        enum status
        int current_step
        text transcript
        text final_content
        jsonb assignment_data
        jsonb gap_analysis
        jsonb course_context
        string error_message
        decimal estimated_cost
        uuid locked_by
        int progress_percent
        string progress_message
        text partial_content
        string current_agent
        timestamp started_at
        timestamp completed_at
        string resume_token
        int last_checkpoint_step
        timestamp created_at
        timestamp updated_at
    }

    GENERATION_LOGS {
        uuid id PK
        uuid generation_id FK
        string agent_name
        string message
        enum log_type
        jsonb metadata
        timestamp created_at
    }

    CHECKPOINTS {
        uuid id PK
        uuid generation_id FK
        string step_name
        int step_number
        text content_snapshot
        jsonb metadata
        timestamp created_at
    }

    GENERATION_METRICS {
        uuid id PK
        uuid generation_id FK
        string stage_name
        decimal stage_weight
        timestamp started_at
        timestamp completed_at
        int duration_ms
        int token_count
        decimal cost_estimate
        jsonb metadata
        timestamp created_at
    }

    HISTORICAL_TIMING {
        uuid id PK
        string stage_name
        enum mode
        int avg_duration_ms
        int min_duration_ms
        int max_duration_ms
        int sample_count
        timestamp last_updated
    }

    FEEDBACK_SCORES {
        uuid id PK
        uuid generation_id FK
        string agent_name
        int iteration
        decimal overall_score
        decimal completeness_score
        decimal accuracy_score
        decimal pedagogy_score
        decimal formatting_score
        text feedback_text
        jsonb suggestions
        jsonb metadata
        timestamp created_at
    }

    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        enum default_mode
        boolean auto_save
        boolean show_preview
        boolean email_notifications
        string theme
        jsonb default_course_context
        jsonb custom_templates
        jsonb generation_settings
        timestamp created_at
        timestamp updated_at
    }

    STAGE_WEIGHTS {
        uuid id PK
        string stage_name
        int stage_order
        int weight_percent
        string description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PROFILES ||--o{ GENERATIONS : creates
    PROFILES ||--o{ USER_PREFERENCES : has
    GENERATIONS ||--o{ GENERATION_LOGS : logs
    GENERATIONS ||--o{ CHECKPOINTS : saves
    GENERATIONS ||--o{ GENERATION_METRICS : tracks
    GENERATIONS ||--o{ FEEDBACK_SCORES : evaluates
```

### Table Descriptions

#### `profiles`
Extends Supabase Auth with application-specific user data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references auth.users |
| `email` | TEXT | User email address |
| `role` | ENUM | 'admin' or 'user' |
| `credits` | INTEGER | Generation credits remaining |

#### `generations`
Core table storing content generation jobs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique generation identifier |
| `user_id` | UUID | Owner of the generation |
| `topic` | TEXT | Main generation topic |
| `subtopics` | TEXT | Comma-separated subtopics |
| `mode` | ENUM | 'pre-read', 'lecture', or 'assignment' |
| `status` | ENUM | Current generation status |
| `final_content` | TEXT | Generated content output |
| `progress_percent` | INTEGER | Real-time progress (0-100) |
| `resume_token` | TEXT | Token for resuming interrupted jobs |

#### `generation_metrics`
Performance tracking for each pipeline stage.

| Column | Type | Description |
|--------|------|-------------|
| `stage_name` | TEXT | Name of the pipeline stage |
| `duration_ms` | INTEGER | Time spent in stage |
| `token_count` | INTEGER | Tokens consumed |
| `cost_estimate` | DECIMAL | Estimated API cost |

#### `feedback_scores`
Quality evaluation results from Critic and Reviewer agents.

| Column | Type | Description |
|--------|------|-------------|
| `overall_score` | DECIMAL | 0.00-1.00 quality score |
| `completeness_score` | DECIMAL | Content completeness |
| `accuracy_score` | DECIMAL | Factual accuracy |
| `pedagogy_score` | DECIMAL | Educational quality |
| `formatting_score` | DECIMAL | Structure and formatting |

---

## Agent Architecture

### Agent Hierarchy

```mermaid
graph TB
    subgraph "Base"
        Base[BaseAgent]
    end

    subgraph "Specialized Agents"
        CD[CourseDetectorAgent]
        AN[AnalyzerAgent]
        CR[CreatorAgent]
        SN[SanitizerAgent]
        RV[ReviewerAgent]
        RF[RefinerAgent]
        CT[CriticAgent]
        VD[ValidatorAgent]
        FM[FormatterAgent]
    end

    subgraph "Utilities"
        AU[assignment-validator]
        SU[content-sanitizer]
        JP[json-parser]
        TD[text-diff]
    end

    Base --> CD
    Base --> AN
    Base --> CR
    Base --> SN
    Base --> RV
    Base --> RF
    Base --> CT
    Base --> VD
    Base --> FM

    CD -.-> JP
    AN -.-> JP
    CR -.-> JP
    SN -.-> SU
    RV -.-> AU
    RF -.-> TD
    CT -.-> AU
    FM -.-> JP
```

### Agent Responsibilities

| Agent | Purpose | Input | Output |
|-------|---------|-------|--------|
| **CourseDetector** | Identify subject domain | Topic, subtopics, transcript | Domain, confidence, characteristics |
| **Analyzer** | Analyze transcript coverage | Subtopics, transcript | Covered/partially covered/not covered |
| **Creator** | Generate initial content | Topic, subtopics, context | Draft content |
| **Sanitizer** | Verify against transcript | Content, transcript | Sanitized content |
| **Reviewer** | Quality assessment | Content, mode, context | Score, feedback, needsPolish |
| **Refiner** | Improve based on feedback | Content, feedback | Refined content |
| **Critic** | Comprehensive evaluation | Content, mode, transcript | Category scores, recommendations |
| **Formatter** | Structure output | Raw content | Formatted JSON/data |

### Agent Execution Flow

```mermaid
flowchart TD
    Start([Start]) --> Init[Initialization]
    Init --> CD{Course Detection}
    CD -->|Transcript| GA[Gap Analysis]
    CD -->|No Transcript| Draft[Draft Creation]
    GA --> Draft
    
    Draft -->|Has Transcript| Sanitize[Sanitization]
    Draft -->|No Transcript| Review
    Sanitize --> Review
    
    Review -->|Score < threshold & loops < 3| Refine[Refinement]
    Refine --> Review
    Review -->|Score >= threshold or loops >= 3| Polish[Final Polish]
    
    Polish -->|Assignment mode| Format[Formatting]
    Polish -->|Other modes| Critic
    Format --> Critic
    
    Critic -->|Score < 6.5| Flag[Flag for Review]
    Critic -->|Score >= 6.5| Complete[Completion]
    Flag --> Complete
    
    Complete --> End([End])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style Review fill:#FFD700
    style Critic fill:#87CEEB
```

---

## Technology Stack

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js | 16.1.4 | React framework with App Router |
| **UI Library** | React | 19.2.3 | Component library |
| **Language** | TypeScript | 5.x | Type safety |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Database** | PostgreSQL | 15+ | Primary data store |
| **Auth** | Supabase Auth | 2.x | Authentication |
| **AI** | Anthropic Claude | Sonnet 4.5 | Content generation |

### Key Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.71.2",
  "@supabase/supabase-js": "^2.93.1",
  "@supabase/ssr": "^0.8.0",
  "@tanstack/react-query": "^5.90.19",
  "@monaco-editor/react": "^4.7.0",
  "puppeteer": "^24.36.1",
  "zustand": "^5.0.10",
  "markdown-it": "^14.1.0",
  "mermaid": "^11.12.2"
}
```

### Infrastructure

```mermaid
graph TB
    subgraph "Hosting"
        Vercel[Vercel Edge Network]
        Supabase[Supabase Platform]
    end

    subgraph "CDN"
        Edge[Edge Locations]
        Static[Static Assets]
    end

    subgraph "Compute"
        Next[Next.js Server]
        EdgeFunc[Edge Functions]
    end

    subgraph "Storage"
        DB[(PostgreSQL)]
        Realtime[Realtime]
        Storage2[Object Storage]
    end

    Vercel --> Edge
    Edge --> Static
    Edge --> Next
    
    Next --> EdgeFunc
    Next --> DB
    
    EdgeFunc --> DB
    EdgeFunc --> Realtime
    
    Supabase --> DB
    Supabase --> Realtime
    Supabase --> Storage2
```

### Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        CORS[CORS Policy]
        RLS[Row Level Security]
        Auth[Auth Middleware]
        Input[Input Validation]
    end

    subgraph "Data Protection"
        TLS[TLS 1.3]
        Enc[Encryption at Rest]
        Mask[Data Masking]
    end

    Client --> WAF
    WAF --> CORS
    CORS --> Auth
    Auth --> RLS
    RLS --> Input
    Input --> DB[(Database)]
    
    TLS -.-> Client
    TLS -.-> DB
    Enc -.-> DB
    Mask -.-> DB
```

---

## Performance Considerations

### Caching Strategy

| Layer | Cache Type | TTL | Purpose |
|-------|------------|-----|---------|
| CDN | Static assets | 1 year | JS, CSS, images |
| API | Response cache | 5 min | Public data |
| Database | Query cache | Varies | Frequently accessed |
| Client | SWR/TanStack Query | Configurable | Server state |

### Optimization Techniques

1. **Edge Function Caching**: Cache AI responses for identical inputs
2. **Database Indexing**: Strategic indexes on frequently queried columns
3. **Lazy Loading**: Dynamic imports for heavy components
4. **Streaming**: Progressive content delivery for generations
5. **Connection Pooling**: Efficient database connection reuse

---

## Scalability

### Horizontal Scaling

- **Stateless API**: Next.js API routes are stateless
- **Database**: Supabase handles connection pooling
- **Edge Functions**: Auto-scaling based on demand
- **File Storage**: CDN-backed object storage

### Load Handling

```mermaid
graph LR
    LB[Load Balancer]
    
    subgraph "App Instances"
        A1[Instance 1]
        A2[Instance 2]
        A3[Instance N]
    end
    
    subgraph "Database"
        Primary[Primary]
        Replica1[Read Replica 1]
        Replica2[Read Replica 2]
    end
    
    LB --> A1
    LB --> A2
    LB --> A3
    
    A1 --> Primary
    A2 --> Primary
    A3 --> Primary
    
    A1 -.-> Replica1
    A2 -.-> Replica1
    A3 -.-> Replica2
```

---

## Monitoring & Observability

### Metrics Tracked

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| API Response Time | Histogram | > 2s p95 |
| Error Rate | Counter | > 1% |
| Generation Duration | Histogram | > 60s average |
| Database Connections | Gauge | > 80% capacity |
| Anthropic API Latency | Histogram | > 10s |

### Logging Levels

- **ERROR**: Failures requiring immediate attention
- **WARN**: Anomalies that don't block functionality
- **INFO**: Significant business events
- **DEBUG**: Detailed troubleshooting data

See [MONITORING.md](./MONITORING.md) for complete monitoring setup.
