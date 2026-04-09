# Prompt Templates

> Prompt files live in `public/Prompts/` and are fetched at runtime by `loadPrompt()` in `src/lib/ai/prompts.ts`. Results are cached in a module-level `Map` so each file is fetched only once per page load.

---

## Variable System

All prompt files use `{{VARIABLE_NAME}}` placeholders. `fillPrompt()` replaces every occurrence with the corresponding runtime value using a simple `String.replace` loop. Unknown variables are left as-is (no error).

Variables are populated in `buildCreatorMessages`:

| Variable | Source |
|---|---|
| `{{TOPIC}}` | `input.topic` (sanitized) |
| `{{TRANSCRIPT}}` | Concatenation of all `input.sources[].content` + `input.transcript`, sanitized |
| `{{SOURCE_MATERIAL}}` | Same as `{{TRANSCRIPT}}` (alias used by the TA guide prompt) |
| `{{SUBTOPICS}}` | `input.subtopics` joined by `"; "` |
| `{{PREREQUISITES}}` | `input.prerequisites` joined by `"; "` |
| `{{MCQ_COUNT}}` | `input.questionCounts.mcq` (assignment only) |
| `{{MSQ_COUNT}}` | `input.questionCounts.msq` (assignment only) |
| `{{SUBJECTIVE_COUNT}}` | `input.questionCounts.subjective` (assignment only) |
| `{{TOTAL_COUNT}}` | `mcq + msq + subjective` (assignment only) |
| `{{EASY_COUNT}}` | `mcq + msq` (assignment only) |
| `{{MARKDOWN_CONTENT}}` | Assignment markdown (CSV export only, called separately) |

---

## Prompt Files

### `lecture notes prompt.md`

**Content type**: `lecture`

**Consumed by**: `buildCreatorMessages` when `input.type === 'lecture'`

**Variables**: `{{TOPIC}}`, `{{TRANSCRIPT}}`, `{{SUBTOPICS}}`, `{{PREREQUISITES}}`

**What it produces**: Structured lecture notes for building student mastery. Uses a "two fixed anchors + modular middle" pattern:

- Mandatory top section: `### What You'll Learn` (3–4 action-verb bullets, starts with "In this lesson, you'll learn to…")
- Modular middle: blocks chosen from a library (Concept Intro, Why It Matters, Detailed Walkthrough, Code Example, Analogy Box, Mermaid Diagram, Industry Spotlight, Common Pitfall, Comparison Table, Mini Case Study, Decision Tree/Flow, Try It Yourself). Not all blocks are used — only those that genuinely fit the topic.
- Mandatory bottom section: `### Key Takeaways` (3–5 bullets + "Think of X as…" mental model; no forward-looking content)

Key constraints enforced by the prompt: transcript-scope only (no invented subtopics), no references to "the transcript/lecture/speaker/session", factual corrections via domain knowledge, progressive complexity only for the 1–2 hardest subtopics, original analogies per block.

---

### `pre-lecture notes prompt.md`

**Content type**: `pre-lecture`

**Consumed by**: `buildCreatorMessages` when `input.type === 'pre-lecture'`

**Variables**: `{{TOPIC}}`, `{{SUBTOPICS}}`, `{{PREREQUISITES}}`

**What it produces**: Introductory pre-read content targeting a 0→10/100 knowledge level. Fixed four-part structure:

1. `## What You'll Learn` — discovery language, 3–4 bullets starting with "In this pre-read, you'll discover:"
2. `## Detailed Explanation` — flexible subsections A–I; `Common Misconceptions (G)` and `Visual Overview / Mermaid Diagram (I)` are mandatory
3. `## What's Coming Next` — 3–5 sentence bridge to the live session; no new concepts introduced
4. `## Practice Exercises` — hard-capped at 4 total (up to 3 main + 1 optional Follow-Along); every exercise opens with a curiosity hook, never recall phrasing; each main exercise includes a `Hint:` line; answer key entries end with a hook to the live session

Target length: 1,500–2,500 words (10–15 minute read).

---

### `assignment prompt.md`

**Content type**: `assignment`

**Consumed by**: `buildCreatorMessages` when `input.type === 'assignment'`; the chunk instruction for the active chunk type is prepended before the prompt content

**Variables**: `{{TOPIC}}`, `{{TRANSCRIPT}}`, `{{MCQ_COUNT}}`, `{{MSQ_COUNT}}`, `{{SUBJECTIVE_COUNT}}`, `{{TOTAL_COUNT}}`, `{{EASY_COUNT}}`

**What it produces**: A complete assignment with answer keys. Structure:

1. `## Subtopic Coverage Plan` — lists identified subtopics, 80% coverage target, activated style buckets, question-to-subtopic mapping
2. `### Multiple Choice Questions` — exactly `{{MCQ_COUNT}}` MCQs, Q1 to Q{MCQ_COUNT}; scenario-based, 4 options, 1 correct; progressive difficulty ramp; at least 3 stem structures; at least 1 negative/exception framing
3. `### Multiple Select Questions` — exactly `{{MSQ_COUNT}}` MSQs; 2–3 correct answers per question; at least 1 with 2 correct, at least 1 with 3 correct; varied closing phrasings
4. `## Hard Level Question` — exactly `{{SUBJECTIVE_COUNT}}` subjective question(s); format adapts to domain (Template A: implementation/technical, B: case study/analytical, C: essay/theoretical, D: design/creative, E: hybrid); includes scenario, deliverables, constraints, evaluation criteria, model answer

Option-balancing rules are enforced: correct answer must not be the only option with a qualifier clause, an example, a hedge, or visibly greater detail.

**Note**: each MCQ and MSQ also carries a `**Difficulty:** 0 | 0.5 | 1` field. This is consumed by the CSV export pipeline, not by the generation pipeline itself.

---

### `assignment style buckets.md`

**Content type**: `assignment` (supporting library)

**Consumed by**: `buildCreatorMessages` — appended to the prompt content for every assignment chunk after the main prompt text; loaded in parallel with the main prompt template

**Variables**: none

**What it contains**: A library of ~1,863 question style entries across 27 topic-aware buckets. Bucket 0 ("Common / Universal") applies to all topics. Topic buckets (e.g., Databases, AI/LLM Engineering, NLP, Web Development) are selected by the model based on the transcript subject. The model is instructed to activate Bucket 0 plus at most 3 topic buckets, sample broadly across each bucket's ~69 entries, and enforce a rotation rule: no two consecutive questions may share the same style family or difficulty.

---

### `ta guide prompt.md`

**Content type**: `ta-guide`

**Consumed by**: `buildCreatorMessages` when `input.type === 'ta-guide'`

**Variables**: `{{TOPIC}}`, `{{SOURCE_MATERIAL}}`, `{{SUBTOPICS}}`, `{{PREREQUISITES}}`

**What it produces**: A complete 90-minute TA Session Guide. Fixed structure:

- Session Overview table (two rows only: Session Topic + Total Duration)
- `## Part 1 — Rapidfire Recap (0–15 Minutes)` — exactly 10 quiz questions (MCQ-majority mix), progressive difficulty Q1→Q10, each with a `TA Talking Points` block (`Why correct` + `Why wrong options fail`); Mentimeter character limits enforced internally (question ≤100 chars, each option ≤60 chars)
- `## Part 2 — Subjective Question Discussion (15–45 Minutes)` — exactly 3 live in-class subjective questions (with Topic, Question, Concepts Tested, Step-by-Step Approach, Common Mistakes, Expected Output Format) + 2 take-home questions (with Task List, Solving Direction, Expected Output Format; not fully solved)
- `## Part 3 — Concept Reinforcement (45–90 Minutes)` — open-ended number of topics, each with Key Points, Real-World Example, Common Confusion Areas, Visual Aid (Mermaid diagram preferred); at least one topic must include all four sub-blocks
- `## Final 10 Minutes — Recap & Doubt Resolution` — 4–6 crisp one-sentence recap points
- `## Session Compliance Checklist` — checkbox list in supportive tone
- `## Post-Session Google Form` — placeholder link
- `## TA-to-CC Communication` — gentle norms for surfacing questions ≥24h before the session

Tone rule: the guide may not contain the words "final", "finalized", "do not modify", "do not change", "non-negotiable", "mandatory", "cannot be altered", "exact wording", or "no modifications" anywhere (case-insensitive). The Reviewer checks for violations; the Refiner rewrites flagged sentences in collegial language.

---

### `csv_export_prompt.md`

**Content type**: `assignment` (export utility)

**Consumed by**: the CSV export flow (separate from the generation pipeline; called from the export UI, not from `runPipeline`)

**Variables**: `{{MARKDOWN_CONTENT}}`

**What it produces**: A JSON array of question objects ready for CSV conversion. Each object has fixed keys: `questionType` (`mcsc`/`mcmc`/`subjective`), `contentType`, `contentBody`, answer fields, option fields (1–4), `mcscAnswer`, `mcmcAnswer`, `difficultyLevel`, `answerExplanationType`, `answerExplanation`, and several always-empty fields.

Parsing rules enforced by the prompt:
- Recognizes multiple header formats (`**Question N (MCQ)**`, `### Question N`, `N.`, etc.)
- Strips option prefixes (`A)`, `A.`, `**A)**`) and all markdown formatting from option text
- Difficulty mapping: source values `0/"Easy"` → `'0'`, `0.5/"Medium"` → `'0.5'`, `1/"Hard"/Subjective` → `'1'`
- `contentBody` for MCQ/MSQ includes only the question stem (no options); for Subjective includes everything before the model answer
- `answerExplanation` for Subjective includes the full model answer / editorial solution

---

## Custom Prompt Template System

In addition to the static prompt files, users can define reusable custom instructions via the Settings page.

**Storage**: `localStorage` under the key `news13n_prompt_templates`.

**Data shape** (`src/lib/prompt-templates.ts`):

```ts
interface PromptTemplate {
  id: string;        // crypto.randomUUID()
  name: string;      // display name chosen by user
  content: string;   // free-text instructions
  createdAt: string; // ISO timestamp
}
```

**CRUD**: `getAllTemplates`, `getTemplateById`, `saveTemplate`, `updateTemplate`, `deleteTemplate` — all operate synchronously on `localStorage`.

**How it's injected**: In `buildCreatorMessages`, if `input.promptTemplateId` is set, `getTemplateById` resolves the template and its `content` is included in the system prompt under a `CUSTOM INSTRUCTIONS FROM USER` header. If `input.customPrompt` is also set (one-time instruction, not saved), it is appended after the template content. Both are joined and injected together:

```
CUSTOM INSTRUCTIONS FROM USER (follow these carefully):
[template.content]

[input.customPrompt]
```

This block is appended to the Creator system prompt after the base role description and the optional length directive. It applies to every content type.
