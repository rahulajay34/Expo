# Architecture

## System Overview

New-S13n is a client-heavy Next.js application. The browser handles content storage, rendering, and export. The only server component is a single API route (`/api/minimax`) that proxies requests to the MiniMax M2.7 model.

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  ┌─────────┐   ┌──────────┐   ┌────────────────────┐    │
│  │  Upload  │──>│ Pipeline │──>│  Content Viewer    │    │
│  │  Form    │   │ Runner   │   │  (Markdown + Math  │    │
│  └─────────┘   └────┬─────┘   │   + Mermaid)       │    │
│                      │         └─────────┬──────────┘    │
│                      │                   │               │
│                      v                   v               │
│              ┌──────────────┐   ┌──────────────┐         │
│              │ localStorage │   │   Export      │         │
│              │  (5MB limit) │   │  (PDF/CSV/    │         │
│              └──────────────┘   │   HTML/MD)    │         │
│                                 └──────────────┘         │
└──────────────────────┬───────────────────────────────────┘
                       │ SSE (streaming)
                       v
              ┌──────────────────┐
              │  /api/minimax    │
              │  (Next.js route) │
              └────────┬─────────┘
                       │
                       v
              ┌──────────────────┐
              │  MiniMax M2.7    │
              │  (external API)  │
              └──────────────────┘
```

## AI Pipeline Stages

Each content generation request passes through these stages sequentially:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌───────────────┐
│ Creator  │───>│ Reviewer │───>│ Refiner  │───>│ Validator │───>│ CSV Converter │
│          │    │          │    │          │    │           │    │ (assignments  │
│ Generate │    │ Check    │    │ Patch    │    │ Fix       │    │  only)        │
│ initial  │    │ quality  │    │ sections │    │ mermaid   │    │               │
│ content  │    │          │    │          │    │ diagrams  │    │               │
└──────────┘    └──────────┘    └──────────┘    └───────────┘    └───────────────┘
```

### Stage Details

**Creator** — Takes source material + prompt template, generates full content for the requested content type (lecture, pre-lecture, assignment, ta-guide).

**Reviewer** — Evaluates the generated content for quality. Returns either "LGTM" (content is good) or a list of issues to address. If LGTM, the pipeline skips the Refiner.

**Refiner** — Applies targeted patches rather than regenerating from scratch:
- Lecture/pre-lecture/ta-guide: uses `mergeSectionPatches` for section-level edits
- Assignments: uses `mergeQuestionPatches` for question-level edits

**Validator** — Post-pipeline validation focused on Mermaid diagram syntax. Detects broken diagram blocks and attempts auto-repair.

**CSV Converter** — Assignment-only final stage. Converts structured assignment content to CSV format for LMS import.

### Assignment Chunking

Assignments split into three parallel generation tracks:

```
                 ┌─────────┐
                 │ Source   │
                 │ Material │
                 └────┬────┘
                      │
          ┌───────────┼───────────┐
          v           v           v
     ┌────────┐  ┌────────┐  ┌────────────┐
     │  MCQ   │  │  MSQ   │  │ Subjective │
     │ Creator│  │ Creator│  │  Creator   │
     └────┬───┘  └────┬───┘  └─────┬──────┘
          │           │            │
          └───────────┼────────────┘
                      v
              ┌──────────────┐
              │   Stitch +   │
              │ Deduplicate  │
              │ (cleanAssign │
              │  Stitching)  │
              └──────────────┘
```

## Prompt System

Prompt templates are Markdown files stored in `public/Prompts/`. They use `{{VARIABLE}}` syntax for template variables.

**Runtime flow:**
1. `loadPrompt(filename)` — fetches the `.md` template from `public/Prompts/`
2. `fillPrompt(template, variables)` — replaces `{{VARIABLE}}` placeholders
3. The filled prompt is sent to the AI pipeline as a system/user message

Users can also define custom prompt templates via the Settings page, stored in localStorage and managed by `src/lib/prompt-templates.ts`.

## Data Flow

```
User uploads source material (PDF/PPTX/MD)
       │
       v
Source text extracted in browser
       │
       v
Pipeline stages stream responses via SSE from /api/minimax
       │
       v
Generated content stored as ContentItem in localStorage
       │
       v
Content rendered with react-markdown + KaTeX + Mermaid + highlight.js
       │
       v
User can inline-edit content with AI assistance
       │
       v
Export to PDF / CSV / HTML / Markdown via src/lib/export/
```

## Content Storage

All content is stored in browser localStorage as JSON-serialized `ContentItem` objects. The storage layer (`src/lib/storage.ts`) provides:
- CRUD operations with schema guards
- 5MB storage limit management
- Import/export for backup and portability
