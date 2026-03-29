# New-S13n — Design Specification

## Overview

**New-S13n** is a content authoring tool for educators to generate structured educational content (lecture notes, pre-lecture notes, assignments) using a multi-agent AI pipeline, with a Notion-inspired minimal interface.

Target users: Single educator (creator), no student access.

---

## Pages & Navigation

| Route | Purpose |
|-------|---------|
| `/` | **Generation page** (default home) — select content type, configure inputs, trigger pipeline |
| `/content` | **Content library** — search, filter by type/date, view all saved items |
| `/content/[id]` | **Content viewer/editor** — preview + in-place editor, export options |
| `/settings` | API key configuration per provider, app preferences |

**Collapsible sidebar** (240px expanded / 48px collapsed icon-only) on all pages with navigation links.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Notion-inspired custom components
- **Fonts**: Inter (Google Fonts)
- **Markdown rendering**: `react-markdown` + `remark-mermaid` + `remark-math` + `rehype-highlight`
- **File parsing (browser-only)**:
  - PDF: `pdfjs-dist`
  - PPTX: `jszip` — unzip and parse slide XML for text content
  - Markdown / code / text: direct file read
- **Storage**: Browser `localStorage` (warn at >4MB — browsers cap at 5MB per origin)
- **AI SDKs**: OpenAI SDK, MiniMax API, Google Generative AI, xAI SDK
- **Streaming**: Server-Sent Events (SSE) via Next.js API routes
- **Deployment**: Vercel (env vars for API keys)

---

## Design System

### Colors
- Background: `#FFFFFF`
- Sidebar bg: `#F7F6F3` (warm off-white)
- Border: `#E8E8E8`
- Text primary: `#37352F`
- Text secondary: `#787774`
- Accent: `#2383E2` (Notion blue)
- Success: `#3DAF4B`
- Warning: `#D97706`
- Danger: `#DC2626`

### Typography
- Font: Inter (Google Fonts)
- Body: 14px/1.6
- Headings: Notion-style sizing (24/20/16/14px scale)
- Code: JetBrains Mono

### Spacing
- Base unit: 4px
- Consistent padding: 12px, 16px, 24px
- Card radius: 6px
- Sidebar radius: 0 (full height)

---

## Content Model

```typescript
interface ContentItem {
  id: string;              // UUID
  type: 'lecture' | 'pre-lecture' | 'assignment';
  title: string;
  markdown: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;
  provider: 'openai' | 'minimax' | 'gemini' | 'xai';
  sources: { type: string; name: string }[];
  metadata: {
    topic?: string;
    subtopics?: string[];
    prerequisites?: string[];
    questionCounts?: { mcq: number; msq: number; subjective: number };
  };
}
```

---

## Generation Flow (Home Page)

### Step 1 — Select Content Type
Three cards: **Lecture Notes**, **Pre-Lecture Notes**, **Assignment**

### Step 2 — Configure Input
Type-specific form appears:

**Lecture Notes:**
- Topic (text input)
- Transcript: upload PDF/PPTX/MD/TXT, or paste text
- Subtopics (optional, auto-extracted)

**Pre-Lecture Notes:**
- Topic (text input)
- Subtopics (textarea, comma-separated)
- Prerequisites (textarea)

**Assignment:**
- Topic (text input)
- Transcript: upload PDF/PPTX/MD/TXT, or paste text
- Question counts (default: 4 MCQ, 4 MSQ, 1 Subjective — user configurable)

### Step 3 — Select AI Provider
Dropdown: OpenAI / MiniMax / Gemini / xAI

### Step 4 — Generate
"Generate" button triggers the pipeline. Button shows loading state with spinner.

---

## AI Pipeline

### Sequential Pipeline

All stages run sequentially — each stage completes before the next begins. Content streams from Creator to the preview pane in real-time so the user sees the output as it's generated.

**Lecture / Pre-Lecture Notes:**

```
Creator → Reviewer → [if issues] Refiner → Formatter
```

1. **Creator** — Generates raw content using type-specific prompt (reads from `/Prompts/*.md`). Streams output to preview.
2. **Reviewer** — Runs after Creator completes. Flags factual/structural/format issues.
3. **Refiner** — Only called if Reviewer found issues; fixes flagged problems.
4. **Formatter** — Ensures consistent markdown structure, outputs final markdown.

**Assignment:**

```
Creator → Reviewer → [if issues] Refiner → CSV Converter → Formatter
```

1. **Creator** — Generates N questions (configurable MCQ/MSQ/Subjective mix, default 4/4/1). Streams output to preview.
2. **Reviewer** — Runs after Creator completes. Flags issues.
3. **Refiner** — Only called if Reviewer found issues; fixes flagged problems.
4. **CSV Converter** — Converts markdown to CSV via auto-parsing (primary). If auto-parse fails, falls back to AI-assisted conversion using `/Prompts/assignment prompt.md` format instructions.
5. **Formatter** — Final markdown + CSV output.

### Error Handling

| Failure Point | Behavior |
|---------------|----------|
| **Creator fails / times out** | Show error message in preview. Partial output is discarded (cannot safely use incomplete content). User can retry. |
| **Reviewer fails / times out** | Skip Refiner stage. Pipeline proceeds to Formatter with Creator output. Log warning. |
| **Refiner fails / times out** | Use Creator output as-is. Pipeline proceeds to Formatter. Log warning. |
| **CSV auto-parse fails** | Fall back to AI-assisted CSV conversion. If that also fails, export markdown only and notify user. |
| **Formatter fails** | Return markdown from previous stage. Export markdown-only. Notify user. |
| **Invalid API key** | Caught before pipeline starts — validate key format on save in Settings. Runtime auth errors show clear error. |
| **Rate limit / context exceeded** | Show provider-specific error. Offer to retry with reduced input. |

### Token Optimization
- Refiner only fires if Reviewer found real issues
- Formatter is a lightweight structural pass
- CSV Converter tries auto-parse first (zero API cost), only calls AI on failure
- No redundant full-pipeline runs

---

## Assignment Markdown Format (Auto-Parseable)

The Creator prompt will be modified so the output follows this strict structure, enabling auto-conversion to CSV without AI calls.

### MCQ Format
```markdown
**Question 1 (MCQ)**
[contentBody — question scenario only, no options]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answer:** B
**Difficulty:** 0
**Explanation:** [explanation text]
```

### MSQ Format
```markdown
**Question 5 (MSQ)**
[contentBody — question scenario only]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answers:** A, C
**Difficulty:** 0
**Explanation:** [explanation text]
```

### Subjective Format
```markdown
**Question 9 (Subjective)**
[question scenario]

**Deliverables:**
- [deliverable 1]
- [deliverable 2]

**Constraints:**
- [constraint 1]
- [constraint 2]

**Evaluation Criteria:**
1. [criterion 1]
2. [criterion 2]

**Model Answer:**
[the answer]
```

### CSV Column Mapping

The template includes columns for question types not generated by this app (video, int, fitb, floatRange). These unused columns are left empty in the output.

| CSV Column | Source |
|------------|--------|
| `questionType` | `mcq` → `mcsc`, `msq` → `mcmc`, `subjective` → `subjective` |
| `contentType` | `text` (default) — if question body has markdown formatting, override to `markdown` |
| `contentBody` | Question scenario only (no options) |
| `intAnswer` | Empty for MCQ/MSQ/Subjective |
| `prepTime(in_seconds)` | Empty (not applicable for this use case) |
| `floatAnswer.max` | Empty |
| `floatAnswer.min` | Empty |
| `fitbAnswer` | Empty |
| `mcscAnswer` | Option index of correct answer (1-4 for A-D) |
| `mcmcAnswer` | Comma-separated indices for correct options (e.g., "1, 4") |
| `subjectiveAnswer` | Empty — answer goes in `answerExplanation` |
| `option.1` | Option A text |
| `option.2` | Option B text |
| `option.3` | Option C text |
| `option.4` | Option D text |
| `mcmcAnswer` | Comma-separated option indices for MSQ correct answers |
| `tagRelationships` | Empty — LMS-specific field not populated |
| `difficultyLevel` | From `**Difficulty:** 0` in markdown |
| `answerExplanationType` | `text` (default) — if explanation has markdown, override to `markdown` |
| `answerExplanation` | Full explanation text (for subjective: the model answer) |

---

## Export Options

| Format | Implementation |
|--------|---------------|
| Markdown (.md) | Direct download via `Blob` + anchor click |
| PDF | `html2pdf.js` — renders markdown HTML to PDF with controlled styling, page breaks, and header/footer |
| CSV (.csv) | Auto-parse structured markdown → map to CSV columns → download |

**Assignment CSV export** uses auto-parse as primary. AI-assisted conversion is only triggered if auto-parse fails to parse the markdown structure.

---

## Content Library (/content)

- Search bar (full-text search across title + markdown)
- Filter chips: All / Lecture Notes / Pre-Lecture Notes / Assignment
- Sort: Newest / Oldest / A-Z
- Each card shows: title, type badge, date, provider badge
- Click → navigate to `/content/[id]`
- Bulk delete with checkboxes

---

## Settings (/settings)

- **API Keys** section per provider (OpenAI, MiniMax, Gemini, xAI) — text inputs
  - Values pre-filled from env vars if present
  - "Save to browser storage" button
- **Preferences**
  - Default AI provider
  - Clear local storage (with confirmation modal)
- **Storage usage** indicator (MB used)

---

## Prompts

The app reads prompt templates from the `/Prompts` directory at runtime. These are the same prompts currently in use:

- `/Prompts/lecture notes prompt.md`
- `/Prompts/pre-lecture notes prompt.md`
- `/Prompts/assignment prompt.md`

### Assignment Prompt Update Required

The current assignment prompt produces a different markdown format than what the CSV auto-parser expects. Before implementation, the assignment prompt must be updated to produce the structured format defined in this spec (with `**Question N (MCQ/MSQ/Subjective)**` headers, `**Correct Answer:**`, `**Correct Answers:**`, `**Difficulty:**`, `**Explanation:**`, `**Deliverables:**`, `**Constraints:**`, `**Evaluation Criteria:**`, `**Model Answer:**` sections).

The update should preserve the quality requirements (Bloom's taxonomy, scenario-based questions, distractor construction rules, etc.) while changing only the output format.

---

## Responsive Design

- Desktop-first (1024px+)
- Sidebar collapses on smaller screens
- Content pages stack preview/editor on tablet
- Mobile: read-only preview (editing not primary use case)

---

## File Structure

```
/MYAPP
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-03-29-new-s13n-design.md
├── Prompts/
│   ├── lecture notes prompt.md
│   ├── pre-lecture notes prompt.md
│   └── assignment prompt.md
├── template.csv
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Generation page
│   │   ├── content/
│   │   │   ├── page.tsx          # Content library
│   │   │   └── [id]/page.tsx     # Content viewer/editor
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── FileUpload.tsx
│   │   ├── GenerationForm.tsx
│   │   ├── ContentCard.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── storage.ts            # localStorage helpers
│   │   ├── ai/
│   │   │   ├── client.ts        # Unified AI client
│   │   │   ├── pipeline.ts      # Pipeline orchestration
│   │   │   └── prompts.ts       # Prompt loading
│   │   ├── parsers/
│   │   │   ├── pdf.ts
│   │   │   ├── pptx.ts          # JSZip + XML slide parser
│   │   │   └── markdown.ts
│   │   ├── export/
│   │   │   ├── markdown.ts
│   │   │   ├── pdf.ts
│   │   │   └── csv.ts           # Assignment CSV converter
│   │   └── types.ts
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── tailwind.config.ts
├── next.config.js
└── .env.local
```

---

## Scope Boundaries (MVP)

### In Scope
- Single-user, browser-only (no auth, no backend)
- Lecture notes, pre-lecture notes, assignments
- PDF/PPTX/MD/TXT file uploads
- AI pipeline with streaming
- LocalStorage persistence
- Export to MD, PDF, CSV (assignments)
- Notion-style minimal UI

### Out of Scope (Future)
- Dark mode
- Collaborative editing
- Cloud sync
- Course/module hierarchy
- Student-facing view
- Analytics
- Server-side PDF rendering (html2pdf.js handles most cases; puppeteer optional future upgrade)

---

## Design Decisions Summary

1. **Next.js App Router** over single HTML — streaming SSE and routing justify the setup
2. **Sequential AI pipeline** — Creator → Reviewer → Refiner → Formatter (each stage waits for previous)
3. **JSZip for PPTX parsing** — no browser-side PPTX-to-text library exists; JSZip unzips and XML is parsed directly
4. **Browser-only file parsing** — no server cost, but complex PDFs/PPTXs may have extraction limitations
5. **Structured assignment markdown** — enables auto-CSV without extra AI call; AI fallback only if parse fails
6. **localStorage with 4MB warning** — browsers cap at 5MB; warn at 80% threshold
7. **html2pdf.js for PDF export** — more controlled output than window.print(), with proper page breaks and styling
8. **Sequential pipeline with error recovery** — each stage has defined fallback behavior on failure
9. **Env vars + UI for API keys** — works both locally and on Vercel
