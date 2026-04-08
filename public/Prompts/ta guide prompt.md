You are preparing a complete TA (Teaching Assistant) Session Guide — a single markdown document a TA will use to deliver a 90-minute tutorial session. This is a Curriculum Coordinator → TA handoff. Every piece of content the TA needs should live in this one document so they don't have to look anywhere else.

<topic>
{{TOPIC}}
</topic>

<source_material>
{{SOURCE_MATERIAL}}
</source_material>

<subtopics>
{{SUBTOPICS}}
</subtopics>

<prerequisites>
{{PREREQUISITES}}
</prerequisites>

## Tone & Language Rule (applies to the entire document)

The TA guide is a delivery companion, not a governance document. Write every section in a supportive, collegial tone, like a helpful note from a colleague. Do not use directive language. Specifically, do NOT use any of these words or phrases anywhere in the output (case-insensitive):

- "final"
- "finalized"
- "do not modify"
- "do not change"
- "non-negotiable"
- "mandatory"
- "cannot be altered"
- "exact wording"
- "no modifications"

Frame instructions as helpful guidance, gentle norms, and shared commitments — not rules handed down from above. This applies to the Session Overview, Part 1/2/3 goal statements and TA instructions, the Compliance Checklist, and the TA-to-CC Communication section.

## Workflow

### Step 1: Analyze the source material

Read through the provided source material carefully. Identify:
- Key concepts and subtopics covered
- Common confusion areas and misconceptions
- Practical applications and code examples
- Problems that could become live subjective discussion topics

Everything in the TA guide must be grounded in this source material. Do not fabricate content that isn't supported by it.

### Step 2: Part 1 — Rapidfire Recap (10 questions)

Generate exactly **10 quiz questions** drawn from the source material. The 10 questions must follow a **progressive difficulty ladder** — start with the easiest concept checks and gradually ramp up to the hardest application/analysis questions across Q1 → Q10.

**Question type mix:** Dynamic, with MCQ as the majority. The exact split (e.g. 7 MCQ + 3 MSQ, 8 MCQ + 2 MSQ, 6 MCQ + 4 MSQ) is your judgment call based on which concepts lend themselves to multi-select thinking. There is no rigid ratio — just keep MCQs as the majority.

**Mentimeter character limits (enforce these internally — do NOT print the counts, difficulty labels, or source tags in the output):**

- Question text: ≤ 100 characters including spaces
- Each option text: ≤ 60 characters including spaces

Verify these limits for every question and option before writing. If any exceed, rewrite shorter until they fit. The reader must never see a character count, a difficulty tag, or a source tag in the finished document — those are backend-only.

**Question format (use this exactly):**

```markdown
### Question N (MCQ)

**Question:**
`[Question text]`

**Options:**
- A) `[Option text]`
- B) `[Option text]`
- C) `[Option text]`
- D) `[Option text]`

**Correct Answer(s):** [Letter(s)]

**TA Talking Points:**
- **Why correct:** [1–2 sentences on why the right answer is right, with the angle the TA should emphasize when explaining it live]
- **Why wrong options fail:** [1–2 sentences addressing why the tempting distractors are wrong — especially useful for MSQs and tricky MCQs]
```

Use `(MCQ)` for single-correct questions and `(MSQ)` for multi-correct questions. Do not add topic tags, difficulty tags, source tags, or character counts to the heading or anywhere in the visible document.

**Question design principles:**
- Test understanding, not memory (concept-check, not recall)
- Balance across the session's subtopics — don't cluster all questions on one area
- Progressive difficulty ladder: Q1 easiest, Q10 hardest, smooth ramp in between
- Every question must draw from content in the provided source material

Every question needs a `TA Talking Points` block with both the `Why correct` and `Why wrong options fail` bullets.

### Step 3: Part 2 — Subjective Question Discussion

**3 Live In-Class Questions**

Select the three most discussion-worthy problems from the source material. For each, write a full walkthrough:

```markdown
### Live In-Class Subjective Question N

**Question Name:** [Short descriptive name]

**Topic:** [Subtopic / concept name]

**Question:**
`[Full question text]`

**Concepts Tested:** [Comma-separated list of concepts this tests]

**Step-by-Step Approach:**
1. [First step with explanation]
2. [Second step with explanation]
...

**Common Mistakes:**
- [Mistake 1 with brief explanation]
- [Mistake 2 with brief explanation]
...

**Expected Output Format:** [What the student's submission should look like]
```

Do NOT include a "From: [source]" or source-attribution field.

**Delivery guidance to include as part of the Part 2 TA instructions block:** Try to cover all 3 live questions in class, but it's OK to defer one to take-home territory if the discussion is running long or students are feeling overwhelmed. Depth of discussion on 2 questions is better than a rushed walkthrough of 3.

**2 Take-Home Questions**

Pick two additional questions. For each:
- Question name and full question text
- Task list
- Brief solving direction (NOT the full solution)
- Expected output format

Take-home questions should be clearly stated but deliberately not fully solved — outline the direction and leave the rest for students.

### Step 4: Part 3 — Concept Reinforcement Topics

Identify the key concepts that need reinforcement based on the source material. The number of topics is open-ended — include as many as the material genuinely warrants. For each topic:

```markdown
### Topic N: [Topic Title]

**Key Points to Cover:**
- [Point 1 with enough detail for the TA to explain it]
- [Point 2]
...

**Real-World Example:**
[1–2 sentences grounding the concept in a concrete, recognizable scenario — something the TA can hold up to make the idea tangible instead of abstract]

**Common Confusion Areas:**
- [What students often get wrong and how to correct it]
...

**Visual Aid:**
[Embed a real Mermaid diagram here whenever a visual genuinely helps understanding — process flows, relationships between components, before/after comparisons, hierarchies. Keep each diagram under 8–10 nodes with plain-English labels. If a diagram doesn't add value for a particular topic, briefly describe what the TA should sketch or point to instead.]

**Connection to Part 2 (optional):** [Include only when a Part 3 topic naturally ties back to a specific subjective question from Part 2 — do not force an artificial connection]
```

**Visual Aid rule:** Prefer real embedded Mermaid diagrams (use ```mermaid fencing) over whiteboard suggestions. Keep diagrams under 8–10 nodes. Make sure the Mermaid syntax is valid.

At least one topic in Part 3 must include Key Points, a Real-World Example, Common Confusion Areas, and a Visual Aid (Mermaid diagram preferred).

### Step 5: Closing sections

**Final 10 Minutes — Recap & Doubt Resolution**
- Write 4–6 numbered recap points summarizing the session's key takeaways
- Each point should be one sentence — crisp and memorable
- Include a short note that students can leave if they have no doubts, framed warmly

**Session Compliance Checklist**

Include the standard checklist, rewritten in a supportive, collegial tone. Frame items as helpful reminders for a smooth session, not orders. Use checkboxes. Cover:

- Mentimeter quiz set up with all 10 questions
- Camera on throughout the session
- 3 live subjective questions walked through with approach + common mistakes
- Both take-home questions introduced with solving direction
- Concept reinforcement topics covered
- Final 10-minute recap completed
- Same order of sections across breakout rooms for a consistent student experience

**Post-Session Google Form**

Include a short paragraph pointing the TA to the post-session Google Form they fill out after wrapping up. Use a placeholder link (`[Insert Google Form link]`) that the Curriculum Coordinator will swap in before distribution. Phrase it warmly — this is a feedback loop, not a reporting obligation.

**TA-to-CC Communication**

Include a short section with the communication protocol, phrased as a gentle norm:

- For content-related doubts, reach out to the Curriculum Coordinator
- Ideally surface clarifications at least 24 hours before the live session so there's time to resolve them calmly
- Live-session content clarifications are best avoided so the session flow stays smooth

Frame the 24-hour suggestion as a helpful guideline, not a hard cutoff.

### Step 6: Self-check before you finish

Before emitting the document, verify:

**Part 1:**
- [ ] Exactly 10 questions present
- [ ] Progressive difficulty ladder Q1 → Q10
- [ ] MCQs are the majority of the 10 questions
- [ ] Every question has a `TA Talking Points` block with both `Why correct` and `Why wrong options fail`
- [ ] EVERY question text ≤ 100 characters, EVERY option text ≤ 60 characters (verified internally, not printed)
- [ ] No difficulty labels, topic tags, source tags, or character counts visible in the output

**Part 2:**
- [ ] Exactly 3 live + 2 take-home subjective questions
- [ ] Each live question has: Topic, Question, Concepts Tested, Step-by-Step Approach, Common Mistakes, Expected Output Format
- [ ] Part 2 TA instructions include the "aim for 3 live, defer if overwhelming" guidance
- [ ] Take-home questions have solving direction but are NOT fully solved

**Part 3:**
- [ ] At least one concept topic with Key Points + Real-World Example + Common Confusion Areas + Visual Aid
- [ ] Visual Aid uses real embedded Mermaid diagrams (validated syntax, ≤10 nodes) where appropriate
- [ ] `Connection to Part 2` appears only where a natural link exists

**Closing:**
- [ ] 4–6 crisp recap points
- [ ] Compliance checklist in supportive language
- [ ] Post-session Google Form section with placeholder link
- [ ] TA-to-CC Communication section in supportive language

**Tone:**
- [ ] Zero occurrences of "final", "finalized", "do not modify", "do not change", "non-negotiable", "mandatory", "cannot be altered", "exact wording", or "no modifications" anywhere in the document (case-insensitive)
- [ ] Every instruction reads as helpful guidance, not a top-down directive

**Overall:**
- [ ] Session Overview table at the top contains only Session Topic and Total Duration (90 Minutes) — nothing else
- [ ] All content is grounded in the provided source material
- [ ] A TA reading only this document has everything they need

## Output — Exact Document Structure

Emit the full markdown document and nothing else (no preamble, no closing commentary). Follow this structure exactly:

```markdown
# TA Session Guide — {{TOPIC}}

## Session Overview
| Field | Value |
|---|---|
| Session Topic | {{TOPIC}} |
| Total Duration | 90 Minutes |

---

## Part 1 — Rapidfire Recap (0–15 Minutes)

**Goal:** [1–2 sentence goal statement in supportive tone]

**TA Instructions:** [Short paragraph guiding the TA through Part 1 delivery — fast-paced, interactive, concept-check focused. Walk through each question, give students time to respond, then explain the correct answer. Keep the tone supportive.]

### Question 1 (MCQ|MSQ)
[full question block as specified in Step 2]

### Question 2 (MCQ|MSQ)
[...]

... through ...

### Question 10 (MCQ|MSQ)
[...]

---

## Part 2 — Subjective Question Discussion (15–45 Minutes)

**Goal:** [1–2 sentence goal statement in supportive tone]

**TA Instructions:** [Short paragraph guiding the TA through Part 2 delivery. Include the "aim to complete all 3 live questions, but it's OK to defer one to take-home territory if the discussion is running long or students are feeling overwhelmed — depth matters more than coverage" guidance. Keep the tone supportive.]

### Live In-Class Subjective Question 1
[full walkthrough block as specified in Step 3]

### Live In-Class Subjective Question 2
[full walkthrough block]

### Live In-Class Subjective Question 3
[full walkthrough block]

### Take-Home Subjective Question 1

**Question Name:** [Short descriptive name]

**Question:**
`[Full question text]`

**Task List:**
- [Task 1]
- [Task 2]
...

**Solving Direction:** [Brief direction — NOT the full solution]

**Expected Output Format:** [What the student's submission should look like]

### Take-Home Subjective Question 2
[same shape as Take-Home 1]

---

## Part 3 — Concept Reinforcement (45–90 Minutes)

**Goal:** [1–2 sentence goal statement in supportive tone]

**TA Instructions:** [Short paragraph guiding the TA through Part 3 delivery — cover the assigned concept topics, use embedded visual aids, ground each topic in a real-world example, address common confusion areas, run periodic engagement checks. Keep the tone supportive.]

### Topic 1: [Title]
[full topic block with Key Points, Real-World Example, Common Confusion Areas, Visual Aid, optional Connection to Part 2]

### Topic 2: [Title]
[...]

... as many as the source material warrants ...

---

## Final 10 Minutes — Recap & Doubt Resolution

1. [Recap point 1 — one crisp sentence]
2. [Recap point 2]
3. [Recap point 3]
4. [Recap point 4]
5. [Recap point 5 — optional]
6. [Recap point 6 — optional]

**Doubt Resolution:** [Short warm paragraph — invite questions, note that students can leave if they have none]

---

## Session Compliance Checklist

- [ ] Mentimeter quiz set up with all 10 questions
- [ ] Camera on throughout the session
- [ ] 3 live subjective questions walked through with approach + common mistakes
- [ ] Both take-home questions introduced with solving direction
- [ ] Concept reinforcement topics covered
- [ ] Final 10-minute recap completed
- [ ] Same section order across breakout rooms for a consistent student experience

---

## Post-Session Google Form

[Short warm paragraph pointing the TA to the post-session form.]

Form link: `[Insert Google Form link]`

---

## TA-to-CC Communication

[Short supportive paragraph covering: where to surface content-related doubts, the 24-hour-ahead gentle guideline, and the shared goal of keeping live sessions flowing smoothly.]
```

Emit only the filled-in document above — no preamble, no closing commentary. Make sure the tone rule holds across every section.
