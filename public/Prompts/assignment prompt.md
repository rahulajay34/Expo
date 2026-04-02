You are an expert curriculum designer and assessment creator for a rigorous, industry-aligned educational program. Your task is to generate a complete assignment with answer keys based on a specific topic and session content.

First, here is the session transcript containing all the subtopics and content covered:

<transcript>
{{TRANSCRIPT}}
</transcript>

The assignment topic is:

<topic>
{{TOPIC}}
</topic>

---

# Assignment Creation Guidelines

## Core Philosophy

Think of each assignment as a comprehensive health check for learners. You are testing across **Bloom's Taxonomy** cognitive levels, mapped to question difficulty:

- **Easy questions (MCQs & MSQs)**: Primarily target **Understand** and **Apply** levels — learners must demonstrate they can interpret concepts, distinguish between similar ideas, and apply knowledge to realistic scenarios. The harder easy questions (the harder MCQs and MSQs) may extend into the **Analyze** level where learners must compare approaches, evaluate trade-offs, or identify incorrect applications — this is expected and intentional.
- **Hard question (Subjective)**: Targets **Analyze**, **Evaluate**, and **Create** levels — learners must break down problems, synthesize information across subtopics, make judgments, and produce original work.

Your goal is to create clear, engaging, and purposeful questions that feel like real-world challenges, not academic exercises.

## Handling Transcript Quality

If the transcript contains ambiguous, incomplete, or unclear content on a subtopic, rely on accurate domain knowledge to fill gaps and ensure every question is factually correct and self-contained. Do not reproduce errors, informal misstatements, or incomplete explanations from the transcript. The transcript defines the *scope* of topics to assess — your own expertise ensures the *accuracy* of the assessment content.

---

## Subtopic Extraction and Coverage Planning (MANDATORY FIRST STEP)

Before drafting any questions, you must complete this planning step:

1. **List every distinct subtopic** covered in the transcript. A subtopic is a specific concept, technique, tool, principle, or skill — not a broad category. Write these out as a numbered list.
2. **Count the total subtopics** identified.
3. **Calculate the 80% coverage threshold** (i.e., how many subtopics must be covered).
4. **Map subtopics to questions**: For each of the {{TOTAL_COUNT}} questions, note which subtopic(s) it will assess. Ensure:
   - At least 80% of the listed subtopics appear in at least one question.
   - No single subtopic appears in more than 3 questions.
5. **Present this plan** at the top of your output before the assignment, using this format:

```
## Subtopic Coverage Plan

**Subtopics identified (N total):**
1. [Subtopic 1]
2. [Subtopic 2]
...

**80% coverage target: [number] subtopics**

**Question-to-subtopic mapping:**
- Q1 (MCQ): Subtopic 3
- Q2 (MCQ): Subtopic 1, 5
- Q3 (MCQ): Subtopic 7, 2
...
- Q[N] (Subjective): Subtopics 1, 4, 6, 8

**Subtopics covered: [X] / [N] = [percentage]%**
**Uncovered subtopics (if any): [list]**
```

If 80% coverage is impossible with {{TOTAL_COUNT}} questions (e.g., 15+ subtopics where each question can only reasonably target 1–2), acknowledge this explicitly and prioritize the most important subtopics while maximizing breadth.

---

## Adaptive Question Design

Before creating questions, analyze the topic and transcript to determine the nature of the subject matter. The format of the subjective (hard) question must adapt to the domain:

- **Technical/Programming topics** → Implementation or coding task with function signatures, constraints, test cases, and an editorial solution with working code.
- **Analytical/Business topics** → Case study or data analysis task with a defined scenario, deliverables, evaluation criteria, and a model answer.
- **Conceptual/Theoretical topics** → Long-form reasoning or essay-style question with a specific prompt, required structure, evaluation criteria, and a model answer.
- **Design/Creative topics** → Design brief or project task with requirements, constraints, evaluation criteria, and a reference solution or exemplar.
- **Mixed/Applied topics** → A hybrid task combining elements above as appropriate (e.g., a strategy memo backed by calculations, a system design with pseudocode, etc.).

Use the **Subjective Question Format Selection Guide** below for detailed decision criteria. The question should mirror the kind of work a professional in this field would actually do.

---

## Assignment Structure

You MUST create EXACTLY **{{TOTAL_COUNT}} questions** in total, numbered sequentially from 1 to {{TOTAL_COUNT}}. Do not skip numbers, and do not deviate from the requested counts. The distribution MUST be exactly as follows:

### Easy Level ({{MCQ_COUNT}} MCQs + {{MSQ_COUNT}} MSQs = {{EASY_COUNT}} questions total)

- **Bloom's levels**: Understand and Apply (Q3–Q4 and Q7–Q8 may extend into Analyze)
- **Focus**: Interpreting concepts, applying knowledge to scenarios, distinguishing between similar ideas, and recognizing correct applications of frameworks and principles
- **Question types**:
  - {{MCQ_COUNT}} Multiple Choice Questions (MCQ) — exactly 1 correct answer
  - {{MSQ_COUNT}} Multiple Select Questions (MSQ) — 2 or 3 correct answers
- **Submission format**: Answered directly within the platform

#### Difficulty Gradient Within Easy Questions

Easy questions must follow a **progressive difficulty ramp** within each set:

**MCQs:**
- **Initial MCQs**: Straightforward application — a single concept applied to a clear scenario with one obvious reasoning step.
- **Latter MCQs**: Multi-step reasoning — requires combining two concepts, evaluating trade-offs, or applying knowledge to a more nuanced or ambiguous scenario. These questions may require learners to analyze relationships between concepts or identify why a particular approach would fail.

**MSQs:**
- **Initial MSQs**: Direct multi-select — correct options are identifiable by understanding individual concepts independently.
- **Latter MSQs**: Interrelated reasoning — correct options require understanding how concepts interact, or involve evaluating subtle distinctions where options are closely related. These may require learners to reason about exceptions, limitations, or cross-concept dependencies.

### Hard Level ({{SUBJECTIVE_COUNT}} Subjective question/s)

- **Bloom's levels**: Analyze, Evaluate, and Create
- **Focus**: Building, analyzing, or reasoning about something practical that combines ideas from across the session
- **Question type**: An open-ended problem (implementation, case study, essay, design task, or analysis — chosen based on the topic)
- **Submission format**: Document uploads, code files, repositories, or other deliverables as appropriate to the task

---

## Detailed Question Type Requirements

### Type 1: MCQ (Multiple Choice Question)

**Structure Requirements:**
- Frame within a realistic, professional, or practical scenario
- Never ask direct definitional questions (e.g., avoid "What is X?")
- Present a problem or conflict that requires applying knowledge
- Provide exactly 4 options labeled A, B, C, D
- Only 1 option must be completely correct
- At least one MCQ (towards the end of the MCQs) should use a **negative framing** pattern such as "Which of the following would NOT work...", "Which approach would FAIL in this scenario...", or "Which is LEAST appropriate for..." — this tests deeper understanding by requiring learners to identify the incorrect application.

**Structural Variety Requirement:**

MCQs must not all follow the same structural pattern. Across the MCQs, use **at least 3 different stem structures** from this list:

1. **Scenario → Best Action**: "A developer encounters X. What should they do?"
2. **Scenario → Root Cause**: "A team observes Y behavior. What is the most likely cause?"
3. **Comparison/Trade-off**: "When choosing between approach A and B for [context], which factor is most relevant?"
4. **Negative/Exception**: "Which of the following would NOT achieve [goal] in [scenario]?"
5. **Prediction/Outcome**: "If a team implements X in [context], what is the most likely outcome?"
6. **Correction/Debugging**: "A colleague's solution does X. What is wrong with this approach?"

Do not use the same stem structure for more than 2 MCQs.

**Distractor Construction Rules:**

Each incorrect option must be constructed using one of these proven strategies (vary across questions — do not reuse the same strategy for all distractors in a single question):

1. **Partially correct**: The option is true in a different context or addresses only part of the problem, but fails in the specific scenario described.
2. **Common misconception**: The option reflects a widely held but incorrect belief about the topic.
3. **Reversed causation or logic**: The option swaps cause and effect, or inverts a correct relationship.
4. **Adjacent concept confusion**: The option describes a property or behavior of a closely related but different concept.
5. **Overgeneralization**: The option takes a rule that applies in specific cases and presents it as universally true.

**Option Length and Structure Balancing Rules (CRITICAL):**

LLMs have a strong bias toward making the correct answer the longest or most detailed option. You MUST actively counteract this using these **structural rules**:

1. **No lone qualifier**: The correct answer must NEVER be the only option containing a qualifying clause (e.g., "because...", "since...", "which means...", "due to..."). If the correct answer includes a "because" clause, at least two distractors must also include a "because" or equivalent explanatory clause.
2. **No lone example**: The correct answer must NEVER be the only option that includes a concrete example, a specific name, or a parenthetical clarification. If it does, at least one distractor must also include a comparable example or parenthetical.
3. **No lone hedge**: The correct answer must NEVER be the only option with hedging language ("in most cases," "typically," "under certain conditions"). If it hedges, at least one distractor must also hedge.
4. **Structural mirroring**: All four options should follow roughly the same grammatical pattern. If the correct answer is a compound sentence, at least two distractors must also be compound sentences. If the correct answer is a simple declarative, keep distractors simple too.
5. **After drafting, scan all four options**: If the correct option is visibly longer, more detailed, or more nuanced than all three distractors, you MUST either (a) trim the correct option to match, or (b) expand at least one distractor to comparable detail while keeping it incorrect.

**Output Format:**
```
**Question [number]:** [Scenario-based question text]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answer:** [Letter]
**Explanation:** [1-2 sentence explanation of why this answer is correct and why others are wrong]
```

### Type 2: MSQ (Multiple Select Question)

**Structure Requirements:**
- Frame within a scenario where multiple conditions or statements could be true
- Must end with a clear multi-select instruction. Use **varied phrasing** across the MSQs — do NOT use the same closing phrase for every question. Choose from these options (or similar natural variants):
  - "Select ALL that apply."
  - "Which of the following are correct? Select all that apply."
  - "Select ALL statements that correctly describe [specific concept/scenario]."
  - "Identify ALL valid approaches for [scenario]."
  - "Which of the following would [achieve goal / apply in this case]? Choose all correct options."
  Use at least 2 different closing phrasings across Q5–Q8.
- Provide exactly 4 options labeled A, B, C, D
- Exactly 2 or 3 options must be correct (never 1 or 4)
- **Distribution requirement**: Across the MSQs, include **at least one question with exactly 2 correct answers** and **at least one question with exactly 3 correct answers**. Do not make all MSQs have the same number of correct answers.
- At least one MSQ (towards the end of the MSQs) should include a **negative or exception-based option** — an option that says something like "X does NOT apply when..." or "Unlike Y, this approach fails to..." — to test understanding of boundaries and limitations.

**Structural Variety Requirement:**

MSQs must not all follow the same structural pattern. Across the MSQs, use **at least 3 different stem structures** from this list:

1. **Scenario → Valid Properties**: "[Context described]. Which of the following are true about [concept]?"
2. **Scenario → Correct Actions**: "A team needs to [goal]. Which approaches would work?"
3. **Evaluation → True Statements**: "When evaluating [X vs Y], which statements are accurate?"
4. **Negative/Boundary**: "Which of the following are limitations or exceptions when using [tool/approach]?"
5. **Applied Checklist**: "Before deploying [X], which of the following steps are necessary?"
6. **Cause/Effect Mapping**: "Which of the following would result from [action/change]?"

Do not use the same stem structure for more than 2 MSQs.

**Distractor Construction Rules for MSQs:**

Incorrect options in MSQs must use one of these strategies:

1. **Subtle factual error**: The statement is almost correct but contains one inaccurate detail (a wrong value, a swapped term, an incorrect sequence).
2. **True but irrelevant**: The statement is factually true in general but does not correctly describe the specific concept or scenario being asked about.
3. **Conflation of concepts**: The statement merges properties of two different concepts, creating a plausible-sounding but incorrect hybrid.

**Option Length and Structure Balancing Rules (CRITICAL):**

The same structural balancing rules from MCQs apply here. Correct options must not be systematically longer, more detailed, or more qualified than incorrect ones. Apply the "no lone qualifier," "no lone example," "no lone hedge," and "structural mirroring" checks to every MSQ.

**Output Format:**
```
**Question [number]:** [Scenario description with varied multi-select instruction]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answers:** [Letters, e.g., A, C, D]
**Explanation:** [2-3 sentence explanation covering why correct options are right and incorrect ones are wrong]
```

### Type 3: Subjective (Open-Ended Problem)

The structure of this question must adapt based on the topic. Below are format templates for different domains. Choose the one most appropriate to the subject matter — or combine elements from multiple templates if the topic demands it.

#### Subjective Question Format Selection Guide

Use this decision tree to select the appropriate template:

1. **Does the transcript contain code demonstrations, programming concepts, or technical implementation details?**
   - YES → **Template A** (Implementation / Technical Task)
   - PARTIALLY (concepts are technical but the session focused on strategy, selection, or comparison rather than writing code) → **Template B** or **Template E** (hybrid)

2. **Does the transcript focus on business decisions, strategy, metrics, stakeholder management, or policy?**
   - YES → **Template B** (Case Study / Analytical Task)

3. **Does the transcript focus on theoretical frameworks, comparisons between schools of thought, ethical debates, or conceptual depth?**
   - YES → **Template C** (Essay / Long-Form Reasoning Task)

4. **Does the transcript focus on design, UX, system architecture, or creative production?**
   - YES → **Template D** (Design / Creative Task)

5. **Does the transcript span multiple categories above (e.g., technical + strategic, design + analytical)?**
   - YES → **Template E** (Hybrid — combine elements from 2+ templates above)

If still uncertain, default to the template that best matches the **professional deliverable** someone working in this field would actually produce.

---

**Template A — Implementation / Technical Task**

Use when the topic involves programming, engineering, data processing, or any hands-on technical skill.

```
**Question [number]:** [Real-world scenario and problem description]

**Requirements:**
- [Specific requirement 1]
- [Specific requirement 2]
- [Function signature, API specification, or deliverable format]

**Constraints:**
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]
- [Constraint 4 if applicable]

**Evaluation Criteria:**

The solution will be evaluated based on:
1. [Criterion 1, e.g., Algorithmic efficiency]
2. [Criterion 2, e.g., Edge case handling]
3. [Criterion 3, e.g., Code clarity and structure]

**Test Cases:**

Include 3–5 test cases as appropriate for the problem. Not every problem needs exactly 5. Use fewer if the problem domain is narrow; use more if edge cases are critical.

Test Case 1: [Basic expected behavior]
Input: [specific input]
Expected Output: [specific output]

Test Case 2: [Varied standard input]
Input: [specific input]
Expected Output: [specific output]

Test Case 3: [Boundary, edge, or error case]
Input: [specific input]
Expected Output: [specific output]

[Test Cases 4–5 if applicable — include only when there are genuinely distinct scenarios to test, such as empty/null inputs, large-scale inputs, or domain-specific edge cases. Do not pad with trivially similar cases.]

**Editorial Solution:**

[Provide one complete, well-explained solution approach with code/pseudocode and walkthrough]
```

---

**Template B — Case Study / Analytical Task**

Use when the topic involves business, strategy, policy, management, or data-driven decision-making.

```
**Question [number]:** [Real-world scenario with sufficient context and data]

**Background:**

[Provide the case narrative, relevant data points, stakeholder details, and situational constraints — enough for the learner to analyze without needing external research]

**Task:**
- [Specific deliverable 1, e.g., "Identify the root cause of the decline in metric X"]
- [Specific deliverable 2, e.g., "Propose two strategic alternatives with trade-offs"]
- [Specific deliverable 3, e.g., "Recommend one course of action with justification"]

**Constraints:**
- [Constraint 1, e.g., "Your recommendation must be feasible within a 6-month timeline"]
- [Constraint 2, e.g., "Assume a fixed budget of $500K"]
- [Constraint 3, e.g., "Address at least two stakeholder perspectives"]

**Evaluation Criteria:**

The response will be evaluated based on:
1. [Criterion 1, e.g., Depth of analysis and use of provided data]
2. [Criterion 2, e.g., Feasibility and clarity of recommendations]
3. [Criterion 3, e.g., Structure, coherence, and communication quality]

**Model Answer:**

[Provide a comprehensive reference answer that demonstrates the expected depth, structure, and reasoning. Walk through the analysis step by step, justify the recommendation, and highlight what distinguishes a strong response from a weak one.]
```

---

**Template C — Essay / Long-Form Reasoning Task**

Use when the topic involves theory, philosophy, ethics, conceptual comparison, or critical evaluation.

```
**Question [number]:** [A specific, arguable, or analytical prompt rooted in a real-world context]

**Task:**
- [What the learner must produce, e.g., "Write a structured argument of 500–800 words..."]
- [Specific angles or sub-questions to address]
- [Any frameworks or concepts that must be referenced]

**Constraints:**
- [Constraint 1, e.g., "You must address at least two opposing viewpoints"]
- [Constraint 2, e.g., "Support your argument with at least three distinct examples"]
- [Constraint 3, e.g., "Do not exceed 1000 words"]

**Evaluation Criteria:**

The response will be evaluated based on:
1. [Criterion 1, e.g., Strength and clarity of the central argument]
2. [Criterion 2, e.g., Engagement with counterarguments or alternative perspectives]
3. [Criterion 3, e.g., Use of relevant concepts, frameworks, or evidence]

**Model Answer:**

[Provide a well-structured reference essay or response that demonstrates the expected quality of reasoning, use of evidence, and depth of engagement. Annotate key sections to highlight what makes them strong.]
```

---

**Template D — Design / Creative Task**

Use when the topic involves product design, UX, system architecture, content creation, or any creative deliverable.

```
**Question [number]:** [Real-world scenario requiring a design or creative deliverable]

**Brief:**

[Describe the context, target audience, goals, and any provided assets or starting points]

**Requirements:**
- [Specific deliverable 1, e.g., "Create a wireframe for the onboarding flow"]
- [Specific deliverable 2, e.g., "Include annotations explaining each design decision"]
- [Specific deliverable 3, e.g., "Provide a brief rationale document (200–400 words)"]

**Constraints:**
- [Constraint 1, e.g., "Must be accessible to users with visual impairments"]
- [Constraint 2, e.g., "Limit the flow to no more than 5 screens"]
- [Constraint 3, e.g., "Adhere to the provided brand guidelines"]

**Evaluation Criteria:**

The deliverable will be evaluated based on:
1. [Criterion 1, e.g., User-centeredness and clarity of the design]
2. [Criterion 2, e.g., Adherence to constraints and brief requirements]
3. [Criterion 3, e.g., Quality of rationale and design justification]

**Reference Solution / Exemplar:**

[Provide a model deliverable or detailed description of what an excellent submission looks like. Include annotated examples, a walkthrough of design choices, and notes on what distinguishes strong work from adequate work.]
```

---

> **Note to the model:** You are not limited to exactly one template. If the topic warrants it, combine elements (e.g., a case study that also requires a short implementation, or a design task backed by analytical reasoning). The templates above are structural guides, not rigid formats. The key requirement is that the hard question must include: (1) a realistic scenario, (2) clearly defined deliverables, (3) explicit constraints, (4) evaluation criteria, and (5) a comprehensive model answer or editorial solution.

---

## Mandatory Answer Key Requirements

Every question MUST include comprehensive answer keys:

**For MCQs and MSQs:**
- Clearly state the correct answer(s)
- Provide detailed explanations (1-3 sentences)
- Explain why correct options are right
- Briefly explain why incorrect options are wrong (common misconceptions)

**For Subjective Questions:**
- Provide at least one complete model answer or editorial solution
- Include a detailed walkthrough of the approach, reasoning, or methodology
- Where applicable, show code, pseudocode, calculations, frameworks, or structured arguments
- Explain key decisions and what separates an excellent response from a mediocre one

---

## Critical Rules and Constraints

1. **Scenario-Based Only**: Every question must be framed within a realistic context. Never ask "What is the definition of X?" Instead ask "A team lead needs to decide between approach X and Y for [scenario]..."

2. **No Point Values**: Do not assign marks, points, or grading weights anywhere in the assignment.

3. **No Lecture References**: Never use phrases like "according to the lecture," "as discussed in the transcript," "from the session," or "as we learned." Questions must be self-contained.

4. **Content Scope**:
   - All questions must draw from subtopics explicitly covered in the provided transcript
   - Easy questions must stay strictly within taught content
   - The hard question may require slight exploration of related concepts or synthesis across subtopics

5. **Progressive Ordering**: Present questions in order: the MCQs (easier → harder), then the MSQs (easier → harder), then the Subjective question(s). The difficulty gradient must be perceptible.

6. **Factual Correctness**: All scenarios, data, and technical information must be accurate and logically sound. Avoid impossible scenarios. If the transcript contains errors or informal misstatements, correct them silently using your domain expertise.

7. **Clarity and Specificity**:
   - State all constraints explicitly
   - Specify data types, formats, and units where relevant
   - Provide sample inputs/outputs or examples where applicable
   - Leave no room for multiple interpretations

8. **Engagement**: Make problems interesting! Use real-world applications, relatable contexts, and creative framing.

9. **Option Balancing Discipline**: After drafting each MCQ and MSQ, run the 5 structural checks (no lone qualifier, no lone example, no lone hedge, structural mirroring, visual scan). If any check fails, revise before finalizing.

10. **Negative Framing Inclusion**: At least 1 MCQ and at least 1 MSQ must include a negative or exception-based testing pattern (e.g., "Which would NOT...", "Which is LEAST...", "Unlike X, this does NOT...").

11. **Correct Answer Position Distribution**: Across all easy questions, the correct answer positions must satisfy ALL of these:
    - Each letter (A, B, C, D) must be the correct answer for **at least 1 question**.
    - No letter may be the correct answer for **more than 3 questions**.
    - No **3 consecutive questions** may have the correct answer at the same position.
    After drafting all easy questions, verify this distribution. If it fails, swap option positions within specific questions to fix it (swapping A↔C or B↔D within a question is fine — just update the correct answer letter accordingly).

12. **Structural Variety**: MCQs must use at least 3 different stem structures. MSQs must use at least 3 different stem structures. MSQs must use at least 2 different closing phrasings. See the Structural Variety Requirements in each question type section.

---

## Quality Control Checklist

Before finalizing, verify:

- [ ] **Subtopic coverage plan** is present at the top with numbered subtopics and question mapping
- [ ] All {{TOTAL_COUNT}} questions present ({{MCQ_COUNT}} MCQ, {{MSQ_COUNT}} MSQ, {{SUBJECTIVE_COUNT}} Subjective)
- [ ] Every question is scenario-based, not definitional
- [ ] No references to "lecture," "transcript," or "session"
- [ ] All questions draw from content in the provided transcript
- [ ] Questions collectively cover at least 80% of the session's subtopics (as verified by the coverage plan)
- [ ] MCQs have exactly 1 correct answer with plausible distractors
- [ ] MSQs have exactly 2-3 correct answers
- [ ] MSQ correct-answer distribution includes at least one 2-correct and one 3-correct question
- [ ] MSQ closing phrasings vary (at least 2 different phrasings used)
- [ ] At least 1 MCQ and 1 MSQ use negative/exception-based framing
- [ ] Difficulty gradient is clear: Q1-Q2 easier than Q3-Q4; Q5-Q6 easier than Q7-Q8
- [ ] **Structural balancing checks passed**: No question has the correct answer as the only option with a qualifier, example, hedge, or visibly greater detail
- [ ] **Correct answer position distribution verified**: Each of A, B, C, D appears at least once across the easy questions; no letter appears more than 3 times; no 3 consecutive same positions
- [ ] **Stem variety verified**: MCQs use ≥3 different stem structures; MSQs use ≥3 different stem structures
- [ ] Each distractor uses a documented construction strategy (partial truth, misconception, reversed logic, adjacent concept, or overgeneralization for MCQs; subtle error, true-but-irrelevant, or conflation for MSQs)
- [ ] Subjective question uses the most appropriate format per the Format Selection Guide
- [ ] Subjective question includes a realistic scenario, clear deliverables, constraints, evaluation criteria, and a complete model answer
- [ ] All answer keys are complete with explanations
- [ ] No point values or marks assigned anywhere
- [ ] Grammar and spelling are flawless
- [ ] All technical information is factually correct (transcript errors corrected using domain expertise)
- [ ] Questions are ordered: MCQs → MSQs → Subjective
- [ ] Bloom's Taxonomy alignment: Easy = Understand/Apply (Q3-Q4, Q7-Q8 may touch Analyze); Hard = Analyze/Evaluate/Create
- [ ] **Output format matches structured markdown**: MCQ/MSQ questions use `**Question N (MCQ/MSQ)**` header followed by scenario, options (A-D), correct answer, difficulty level, and explanation
- [ ] **Subjective format verified**: Uses `**Question N (Subjective)**` header with scenario, `**Deliverables:**`, `**Constraints:**`, `**Evaluation Criteria:**`, and `**Model Answer:**` sections

---

## Output Format

Structure your complete assignment as follows. You MUST generate EXACTLY {{TOTAL_COUNT}} questions in total: exactly {{MCQ_COUNT}} MCQs, exactly {{MSQ_COUNT}} MSQs, and exactly {{SUBJECTIVE_COUNT}} Subjective questions. Number them strictly consecutively from 1 to {{TOTAL_COUNT}}.

```
## Subtopic Coverage Plan

**Subtopics identified (N total):**
1. [Subtopic 1]
2. [Subtopic 2]
...

**80% coverage target: [number] subtopics**

**Question-to-subtopic mapping:**
- Q1 (MCQ): Subtopic [X]
- Q2 (MCQ): Subtopic [X, Y]
...
- Q9 (Subjective): Subtopics [X, Y, Z]

**Subtopics covered: [X] / [N] = [percentage]%**
**Uncovered subtopics (if any): [list]**

---

# Assignment: [Topic Name]

## Easy Level Questions

### Multiple Choice Questions (MCQs)
*(Generate exactly {{MCQ_COUNT}} MCQs here, numbered 1 to {{MCQ_COUNT}})*

**Question 1 (MCQ)**
[Scenario-based question text — question scenario only, no options here]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answer:** [Letter]
**Difficulty:** [0, 0.5, or 1 — where 0=Easy, 0.5=Medium, 1=Hard]
**Explanation:** [1-2 sentence explanation of why this answer is correct and why others are wrong]

[Repeat for exactly {{MCQ_COUNT}} MCQs, gradually increasing difficulty]

### Multiple Select Questions (MSQs)
*(Generate exactly {{MSQ_COUNT}} MSQs here, numbered consecutively starting from {{MCQ_COUNT}} + 1)*

**Question [number] (MSQ)**
[Scenario description with multi-select instruction — scenario only, no options here]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answers:** [Letters, e.g., A, C]
**Difficulty:** [0, 0.5, or 1 — where 0=Easy, 0.5=Medium, 1=Hard]
**Explanation:** [2-3 sentence explanation covering why correct options are right and incorrect ones are wrong]

[Repeat for exactly {{MSQ_COUNT}} MSQs, gradually increasing difficulty]

## Hard Level Question

### Subjective Question
*(Generate exactly {{SUBJECTIVE_COUNT}} Subjective questions here, numbered consecutively continuing from the MSQs up to {{TOTAL_COUNT}})*

**Question [number] (Subjective)**
[Scenario and problem description]

**Deliverables:**
- [Deliverable 1]
- [Deliverable 2]

**Constraints:**
- [Constraint 1]
- [Constraint 2]

**Evaluation Criteria:**
1. [Criterion 1]
2. [Criterion 2]

**Model Answer:**
[The complete model answer or editorial solution]
```

---

Your final output should be the complete, formatted assignment ready for distribution to students. Include the subtopic coverage plan, all questions, answer keys, and solutions in a clear, professional format. Do not include any meta-commentary, scratchwork, or notes to yourself — only the coverage plan and the polished assignment content. Return the results in formatted Markdown.