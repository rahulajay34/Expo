# GCCP — Generated Course Content Platform
## Complete Product Documentation

---

## 1. What Is This App?

GCCP is a web application that lets educators and course creators generate high-quality, curriculum-ready educational materials from scratch — or from an existing lecture transcript — using an AI pipeline. The system takes a topic (and optional subtopics or a transcript) as input and outputs one of three content types: Lecture Notes, Pre-Reads, or Assignments.

The core promise is speed and quality. Content that would normally take hours to produce is generated in roughly 90 seconds, and every piece of output goes through multiple AI review stages before the user ever sees it.

There is no user login, no cloud database, and no subscription wall. Everything is local-first: the app runs in the browser, and all saved generations are stored on the user's device using the browser's local IndexedDB storage.

---

## 2. Core Concept: The 7-Agent Pipeline

The most important thing to understand about this app is that content generation is not a single LLM call. It is an ordered pipeline of seven specialized AI agents, each playing a distinct role:

**Agent 1 — CourseDetector**
Analyzes the topic and any provided transcript to determine the academic domain and context. It figures out what kind of course this is (e.g., data science, business strategy, programming, finance) with a confidence score. This context is fed to every downstream agent to make the output domain-appropriate.

**Agent 2 — Analyzer**
If a transcript is provided, the Analyzer performs a gap analysis. It reads through the transcript and maps it against the requested subtopics, producing three lists: subtopics that are covered, subtopics that are only partially covered, and subtopics that are missing entirely. It also evaluates instructor quality — how well the transcript explains concepts, uses examples, and builds understanding. If the transcript is found to be completely unrelated to the given topic, the pipeline stops here and alerts the user.

**Agent 3 — Creator**
This is the primary content-generation agent. It drafts the full educational content based on the topic, subtopics, content type, and course context. For Lecture Notes, it writes comprehensive in-depth notes. For Pre-Reads, it writes a curiosity-sparking introduction. For Assignments, it generates a set of questions in a structured JSON format. The Creator output streams in real-time — the user sees words appear as they are generated.

**Agent 4 — Sanitizer**
Reviews the draft for factual accuracy, consistency, and clarity. It corrects incorrect statements, tightens ambiguous language, and ensures the content is pedagogically sound. The editor panel displays a visual highlight when this agent is active.

**Agent 5 — Reviewer**
Evaluates the sanitized content against a quality rubric — assessing things like logical flow, completeness, appropriate difficulty level, and alignment with the stated subtopics. The editor panel highlights differently when this agent is working.

**Agent 6 — Refiner**
Takes the reviewer's feedback and applies it as targeted edits to polish the content. Rather than rewriting everything, the Refiner makes surgical improvements — fixing weak explanations, adding missing examples, or strengthening transitions.

**Agent 7 — Formatter**
For Lecture Notes and Pre-Reads, the Formatter ensures consistent markdown structure (correct heading hierarchy, code blocks, callout boxes, etc.). For Assignments, it parses and validates the structured JSON output so it can be displayed in the interactive question table.

The pipeline emits live events as each agent works. The UI shows a real-time step tracker so users can see exactly which agent is currently active and what action it's taking.

---

## 3. Pages and Screens

### 3.1 Landing Page (`/`)

The landing page is a marketing-style introduction to the product. It explains what the app does and provides entry points to start generating content.

**Hero section**: A bold headline ("Generate Course Content in minutes, not hours") with a brief description. Two primary call-to-action buttons — one to go directly to the Generator, one to view the Library. A set of four stat badges sits below the hero: "7 AI Agents", "~90 Seconds", "3 Content Types", "Quality Assured".

**Three Content Modes section**: Three cards describing the three types of content the app can generate. Each card has a title, description, and a tag indicating its purpose:
- **Lecture Notes** — tagged "Deep Dive". Comprehensive notes with analogies, industry spotlights, try-it-yourself examples, and key takeaways.
- **Pre-Reads** — tagged "Primer". Curiosity-sparking introductions with practice exercises and common misconceptions that prime students before the lecture.
- **Assignments** — tagged "Assessment". Bloom's taxonomy-aligned questions: 4 multiple-choice single-correct (MCSC), 4 multiple-choice multiple-correct (MCMC), and 1 subjective question, all with full answer keys and explanations.

**How It Works section**: Three feature cards describing the pipeline architecture, the real-time streaming behavior, and the quality assurance system.

**CTA footer section**: A final call-to-action inviting users to open the editor.

---

### 3.2 Generator / Editor Page (`/editor`)

This is the main workspace and the most complex screen in the app. It is divided into several functional zones.

#### Top Bar
A persistent header across all pages shows the app logo ("GCCP"), a navigation badge showing the current page, and a status indicator ("Ready" in green, or "Generating" with a spinner). A cost display shows the running dollar total of the current generation.

#### Input Zone
At the top of the editor, two input fields:
- **Topic**: A text input for the main topic name (e.g., "Loops", "Market Segmentation", "Database Normalization").
- **Subtopics**: A multi-line text area where the user can list specific subtopics they want covered, one per line or comma-separated.

#### Content Type Tabs
Below the input fields, three tabs select the content type: **Lecture**, **Pre-Read**, and **Assignment**. The active tab is underlined and highlighted.

For the **Assignment** tab only, three additional numeric inputs appear for controlling question counts: MCSC count, MCMC count, and Subjective count.

#### Toolbar
A row of action buttons:
- **Add Transcript**: Opens a modal or inline area where the user can paste the text of an existing lecture transcript. This is optional — if provided, the Analyzer agent will use it for gap analysis and the Creator will use it as source material.
- **Upload .txt**: Allows uploading a plain text file as the transcript, instead of pasting.
- **Export**: A dropdown with export options (described below).
- **Generate**: The primary action button. Starts the pipeline. While generating, the button changes to show the current agent name and action, and a Stop button appears to abort mid-generation.

#### Pipeline Stepper
While generation is running, a collapsible live progress tracker appears. It shows all the agent steps in sequence (CourseDetector → Analyzer → Creator → Sanitizer → Reviewer → Refiner → Formatter). Each step shows:
- A color-coded icon unique to that agent
- The agent name
- The current action text (e.g., "Analyzing transcript coverage…")
- A live timer showing how long that step has been running
- An estimated time remaining badge
- Status indicators: pending (greyed out), working (spinning indicator), complete (checkmark)

The stepper can be collapsed to save screen space once the user no longer needs to follow the progress.

#### Gap Analysis Panel (shown if a transcript was provided)
After the Analyzer agent completes, a panel appears showing:
- **Transcript Coverage Analysis**: Three color-coded lists showing which subtopics are fully covered (green checkmarks), partially covered (yellow warning), and not covered at all (red X) in the transcript.
- **Instructor Quality Analysis**: A card that evaluates the transcript's teaching effectiveness. It displays a score breakdown across dimensions like clarity, use of examples, concept depth, and engagement, plus a short qualitative summary and suggestions for improvement.

Both panels can be expanded or collapsed.

#### Main Content Area — Lecture Notes and Pre-Reads

For Lecture and Pre-Read modes, the content area is a two-panel split layout:

**Left panel — Editor**: A code editor with line numbers that displays the raw markdown of the generated content. The user can directly edit this content. The panel header shows agent status badges when the Sanitizer, Reviewer, or Refiner is active (the panel border also changes color for each of these agents, providing a visual cue). A "Save .md" button downloads the raw markdown file.

**Right panel — Preview**: A rendered preview of the markdown that updates in real-time as the content is generated or edited. Supports rich rendering including code blocks with syntax highlighting, math/LaTeX equations, Mermaid diagrams, and standard markdown formatting. The preview panel has a full-screen toggle button that expands it to fill the entire content area and hides the editor panel.

Content streams into both panels simultaneously as the Creator agent generates it. Subsequent agents (Sanitizer, Refiner) apply edits that update the content in place.

#### Main Content Area — Assignments

For Assignment mode, the content area switches to the **Assignment Workspace**. This has two views toggled by tabs:

**Table View**: A spreadsheet-like table where each row is one question. Columns include: type (MCSC/MCMC/Subjective), the question text, four option fields (Option A through D), the correct answer field, and an explanation field. Every cell is directly editable inline. The user can also add new question rows or delete existing ones. A "Show/Hide Answers" toggle controls whether the correct answer column is visible (useful for exporting student-facing vs. instructor-facing versions).

**Reference View (Card Mode)**: A card-by-card view that displays one question at a time. Navigation arrows move between cards. Each card shows the full question, all answer options (with option labels A/B/C/D), the highlighted correct answer, and the explanation. For MCMC questions, multiple correct options can be highlighted. The explanation section can be individually collapsed.

An **Export CSV** button downloads the entire assignment as a CSV file.

#### Mismatch Warning
If the Analyzer detects that the provided transcript is completely unrelated to the entered topic and subtopics, the pipeline stops and displays an error banner explaining the mismatch. The user is then offered two choices: generate without the transcript (proceeding with topic only), or go back and fix the topic/transcript inputs.

#### Error Banner
If any step in the pipeline fails, a red error banner appears below the toolbar describing the problem.

---

### 3.3 Library / Archives Page (`/archives`)

The Library is the user's history of all past generations saved on their device.

**Header stats**: Three summary metrics are displayed at the top: total number of saved generations, the date of the most recent generation, and the cumulative token cost (in dollars) across all generations.

**Search bar**: A search input that filters the list by topic name in real-time (debounced). A refresh button forces a reload from local storage.

**Filter tabs**: Tabs to filter the list by content type: All, Lecture, Pre-Read, Assignment.

**Generation cards**: Each saved generation is shown as a card. The card displays:
- The topic name (large and prominent)
- The content type as a color-coded badge (indigo for Lecture, green for Pre-Read, amber for Assignment)
- The date and time of creation
- The number of tokens used and cost
- An "Open" button to navigate to the editor with that generation's content restored
- A delete button (trash icon) to remove that entry from the device

Clicking "Open" loads the saved generation back into the editor, restoring the content, gap analysis results, and all other metadata.

The library auto-manages storage: when more than 50 generations are saved, the oldest ones are automatically deleted to prevent storage bloat.

---

### 3.4 Settings Page (`/settings`)

The Settings page is organized into three sections, each in its own card:

**Storage section**: Shows the number of generations currently stored on the device. Provides a button to clear all saved generations at once, with a confirmation step to prevent accidental deletion. Also shows the current status of the Zustand (in-memory) store — the last generation that was active in the current session.

**API Configuration section**: An expandable section that describes the API key setup required for generation to work. The API key is configured as a server-side environment variable (not in the browser), so this section is informational — it tells the user or administrator how to set up the backend environment. We will be using gemini api key, and use it's latest models like "gemini-3.1-pro-preview", "gemini-3.1-flash-lite-preview", "gemini-3.1-flash-image-preview", "gemini-3-flash-preview".

**About section**: Displays version information and a brief description of the app.

---

## 4. Sidebar Navigation

A fixed left sidebar is present on all app pages. It contains:
- The app logo and name at the top
- Navigation links to three main sections: **Home** (the landing page), **Generate** (the editor), and **Library** (the archives)
- The active page is highlighted with an accent color and a subtle indicator
- A small dot badge appears next to "Generate" when a generation is in progress
- The user's name/avatar is shown at the bottom of the sidebar (in a future auth-enabled version this would be linked to an account; currently it is static)

---

## 5. Export Options

The Export dropdown in the editor toolbar provides multiple ways to get content out of the app:

- **Save as .md**: Downloads the raw markdown content as a file, named after the topic.
- **Export as PDF**: Renders the markdown preview to a PDF file and triggers a browser download.
- **Export CSV** (Assignment mode only): Available from within the Assignment Workspace. Downloads all questions, options, correct answers, and explanations as a CSV spreadsheet.

---

## 6. Real-Time Streaming Behavior

Content generation is not a batch process. As the Creator agent generates text, it streams word-by-word into both the editor and preview panels simultaneously. The user sees content appear in real-time, similar to watching someone type.

Subsequent agents (Sanitizer, Refiner) apply edits using a search-and-replace diff mechanism rather than rewriting the whole document — this means the user sees targeted corrections appear in the content without the entire page flickering or refreshing.

The cost display in the top bar updates after each agent completes, showing the running total in dollars.

A **Stop** button is available during generation. Clicking it immediately aborts the pipeline, leaving whatever content has been generated so far in the editor.

---

## 7. Transcript Handling

Providing a transcript is optional but significantly improves the output quality. When a transcript is provided:

1. The Analyzer agent reads the full transcript and the requested subtopics, and produces the gap analysis (covered / partial / missing).
2. The Instructor Quality agent evaluates the transcript's teaching effectiveness.
3. The Creator agent uses the transcript as a source to build the content, ensuring alignment with what was actually taught.
4. If the transcript is detected as completely irrelevant to the topic, the pipeline halts early and shows a mismatch warning.

Without a transcript, the pipeline skips the Analyzer agent and the Creator generates content purely from the topic and subtopics.

---

## 8. Assignment Question Structure

Assignments consist of three question types, each with its own internal data structure:

**MCSC (Multiple-Choice Single-Correct)**: One question stem, four answer options, one correct answer (stored as a number 1–4 corresponding to Options A–D), and a written explanation for why that answer is correct.

**MCMC (Multiple-Choice Multiple-Correct)**: One question stem, four answer options, multiple correct answers (stored as a comma-separated list of option indices), and a written explanation covering all correct choices.

**Subjective**: A written question that requires a free-text response. Includes a model answer and evaluation rubric in the explanation field.

The default question counts per assignment are 4 MCSC + 4 MCMC + 1 Subjective, but the user can change these counts in the input toolbar before generating.

---

## 9. Local Storage and Persistence

All generated content is saved automatically to the user's browser (IndexedDB) when generation completes. No server-side database or user account is required.

Each saved record includes: topic, subtopics, content type, the final content text, the formatted content (for assignments, the JSON), the gap analysis result, the instructor quality result, cost details (total and per-agent breakdown), the transcript (if one was used), and timestamps.

The app maintains a maximum of 50 saved generations. When the 51st is saved, the oldest record is automatically deleted.

---

## 10. Cost Tracking

Every API call to the underlying AI model is metered. The app tracks:
- Token counts per agent (input tokens and output tokens)
- Cost per agent (calculated from the token counts and the model's pricing)
- Running total cost for the current generation session
- Lifetime cumulative cost shown in the Library page

The cost is displayed live in the top bar during generation and saved with each record for historical reference.

---

## 11. Quality Gates

The pipeline includes internal validation logic ("quality gates") that can route the flow based on the output quality of each agent. If a specific agent's output scores below a minimum threshold, the orchestrator can choose to skip a downstream refinement step, retry with adjusted instructions, or proceed with the best available output. This is an internal mechanism — the user does not directly control it but benefits from it automatically.

---

## 12. Caching

To avoid redundant API calls when the same generation is requested again (same topic, subtopics, and mode), the app implements two levels of caching: an exact-match cache keyed on a hash of the inputs, and a semantic similarity cache that matches semantically equivalent requests. Cache hits are flagged in the generation logs for the CourseDetector and Analyzer agents specifically. Caches are held in memory for the duration of the session.

---

## 13. Metrics Dashboard (Developer Overlay)

An optional debug overlay (the Metrics Dashboard) is accessible from within the editor. It provides an internal view of performance data including per-agent token usage, latency, cost breakdown, cache hit/miss statistics, and any warnings logged during the generation. This is intended for developers and power users monitoring the quality and efficiency of the pipeline.

---

## 14. Complete User Flow (End-to-End)

Here is the full journey a user takes when using the app:

1. User arrives at the Landing Page and reads about the product. They click "Start Generating" or "Open Editor".

2. On the Editor page, the user types a **Topic** (e.g., "Loops in Python").

3. Optionally, the user types **Subtopics** (e.g., "for loops, while loops, break and continue, nested loops").

4. Optionally, the user pastes or uploads a **transcript** of an existing lecture.

5. The user selects a **Content Type** tab: Lecture, Pre-Read, or Assignment.

6. For Assignments, the user optionally adjusts the question counts.

7. The user clicks **Generate**.

8. The pipeline stepper appears. The CourseDetector starts immediately, identifying the domain. If a transcript was given, the Analyzer runs in parallel and the gap analysis panel populates.

9. The Creator agent begins streaming content. Text appears word-by-word in the editor and preview panels.

10. The Sanitizer, Reviewer, and Refiner agents each run in sequence, applying progressive improvements to the content. The editor border changes color as each one activates.

11. For Assignments, the Formatter agent parses the output into structured JSON, and the Assignment Workspace table populates with the generated questions.

12. Generation completes. The pipeline stepper shows all steps as complete. The cost is finalized. The content is automatically saved to the Library.

13. The user can edit the markdown directly in the editor. For assignments, they can edit individual cells in the table view.

14. The user exports the content as markdown, PDF, or CSV.

15. Later, the user visits the **Library** page. They see a card for the generation they just made. They can click "Open" to restore it to the editor, or delete it.

---

## 15. Key Business Rules and Constraints

- A topic is required. Subtopics are optional.
- A transcript is optional. If provided and found unrelated to the topic, generation stops with a warning.
- The total weightage of module scores must equal exactly 100% (this rule applies to the SheetForge sub-tool, not the GCCP generator itself).
- A maximum of 50 generations are stored locally. Older entries are purged automatically when the limit is exceeded.
- All content is stored in the browser — no cloud sync, no login required.
- The API key for the underlying AI model is a server-side configuration. Users do not enter it in the browser.
- Generation can be aborted at any time using the Stop button.
- If the pipeline fails mid-way, whatever content has been generated is preserved in the editor.

---

## 16. SheetForge — Embedded Sub-Tool

Separately within the same codebase, there is a standalone tool called **SheetForge** (Student Tracker Generator). This is a single-page configuration tool for educators who need to generate pre-built Excel grade trackers for student cohorts.

The user configures a set of variables through a four-tab interface and then downloads a fully formula-populated `.xlsx` file. Here is what each tab contains:

**Program tab**: Basic batch settings — program name, batch code, normalization base (the common scale all scores are normalized to, e.g., 10), pass threshold percentage, distinction threshold percentage, maximum raw scores for quizzes and exams, LMS activity maximum, attendance maximum, and the number of sample students to populate the sheet with.

**Modules tab**: A dynamic list of assessment modules. Each module has a name, a type (Quiz or Exam), a weightage percentage, and a maximum raw score. Modules can be added or deleted. A live progress bar shows the total weightage as it is adjusted and turns green when it exactly equals 100% (the target), red when it exceeds 100%, and orange when it is below 100%.

**Grading tab**: A customizable grade band table. Each row defines a grade label (e.g., A+, A, B+), the minimum percentage cutoff, the maximum percentage cutoff, and a description label (e.g., Outstanding, Excellent). Rows can be added or deleted. A minimum of two bands must always exist.

**Extras tab**: Extrapolation and engagement settings — a base extrapolated score offset, a toggle to include LMS activity and attendance in the final overall score calculation, and if enabled, the LMS weight percentage and attendance weight percentage. This tab also shows a "Configuration Preview" card summarizing all settings across all tabs in a compact grid.

When the user clicks "Download .xlsx", the app generates an Excel workbook with three sheets:

- **Dashboard sheet** (shown first): Contains all sample students with their student code, name, email, mobile number, test week, payment status, LMS activity, attendance percentage, raw scores per module, normalized scores per module, weighted scores per module, total weighted percentage, extrapolated score, overall score, and final grade. The final row is a class average summary. All score columns use live Excel formulas that reference the Variables sheet — changing any variable in the Variables sheet automatically recalculates everything.

- **Variables sheet**: A configuration reference sheet that stores all the parameters the user entered — program name, batch code, normalization base, thresholds, module definitions (name, type, weightage, max raw score), grade band definitions, and extrapolation settings. This is the single source of truth for all formulas in the Dashboard sheet.

- **Visualization sheet**: An analytics sheet containing formula-driven summary tables: grade distribution (count and percentage per grade), module-wise averages (raw, normalized, and weighted), key metrics (total students, pass count, fail count, pass rate, distinction count, average LMS, average attendance, average overall score, highest score, lowest score, standard deviation, payment pending count), score distribution (student counts in five bands: 0–20%, 20–40%, 40–60%, 60–80%, 80–100%), and LMS activity vs. performance cross-analysis.

The bottom of the screen has a fixed floating action bar that shows either a warning ("Weightage is X% — should be 100%") or a success message ("Ready to generate — N modules, N students"), and the Download button. The download button shows a shimmering animation while the file is being generated and a green success toast appears briefly after the download triggers.

---

*End of documentation.*
