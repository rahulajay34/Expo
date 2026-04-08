You are transforming a lecture transcript into well-structured, beginner-friendly lecture notes that help students build mastery of a topic. Unlike pre-reads (which introduce at a surface level), lecture notes go deeper — take students from basic awareness to solid understanding.

Here is the transcript:

<transcript>
{{TRANSCRIPT}}
</transcript>

The topic for these lecture notes is:
<topic>
{{TOPIC}}
</topic>

<subtopics>
{{SUBTOPICS}}
</subtopics>

<prerequisites>
{{PREREQUISITES}}
</prerequisites>

## Core Principles

- **Audience**: Complete beginners who already have the prerequisite knowledge listed above
- **Goal**: Build mastery by explaining concepts in depth — take students from basic awareness to solid understanding
- **Tone**: Simple, conversational, encouraging — like teaching a curious friend
- **Length**: Aim for a 10–20 minute read. Prioritize depth on the most important concepts rather than exhaustive coverage of every subtopic. Be concise — every sentence should teach something new.

## Critical Constraints

These constraints prevent the most common and serious mistakes:

1. **Only cover subtopics from the transcript.** Do not add content, examples, or subtopics that aren't discussed in the provided transcript. The transcript defines the scope.
2. **Never reference the transcript, lecture, speaker, or session.** Do not use phrases like "according to the transcript", "in the lecture", "the speaker mentions", "as discussed", "this session", or any variant. Write as if you are directly teaching the student. The student does not know a transcript exists.
3. **Factual accuracy over transcript fidelity.** If the transcript contains errors, informal misstatements, or incomplete explanations, silently correct them using accurate domain knowledge. The transcript defines scope; your expertise ensures accuracy.
4. **Build on prerequisite knowledge** without unnecessary repetition.

## Structure: Two Fixed Anchors + a Modular Middle

Only TWO sections are mandatory: **What You'll Learn** at the top and **Key Takeaways** at the bottom. Everything in between is **modular** — pick whichever blocks (in whichever order) best teach the specific transcript content. Do not force every block into every output, and do not skip genuinely useful blocks just because they're not "required".

Use `###` for every block header (including the two anchors) so downstream tooling can treat each block as an independent section.

#### Anchor 1 — What You'll Learn (mandatory, top of output)

Start the output with a section titled exactly `### What You'll Learn`.

- Begin the body with "In this lesson, you'll learn to…"
- Use action verbs (explain, apply, compare, build, identify)
- Include 3–4 short, specific bullet points
- Avoid jargon or abstract goals — say "explain how X works with an example" instead of "understand X"

#### Modular Middle — pick blocks, don't force all

Between the two anchors, pick from the block library below. **Pick only blocks that genuinely help the specific topic.** Skip anything that would feel forced. Order the blocks in whatever sequence builds understanding best for this topic — there is no fixed order.

You may also **invent new block types** (e.g., "Worked Example", "Anatomy Diagram", "Glossary Box") if the topic genuinely needs one and none of the suggested blocks fit. Use plain descriptive names. Do not invent blocks just to be different.

Each block in the OUTPUT is its own `### <Block Name>` section. Keep block names short and descriptive.

##### Block Library

| Block | When to use |
|---|---|
| **Concept Intro** | Open a new subtopic with a one-sentence definition + a relatable analogy. Good as the first block after "What You'll Learn". |
| **Why It Matters** | Explain the problem the concept solves and where it shows up in real life. Use short, direct examples: "You'll need this when…" |
| **Detailed Walkthrough** | Step-by-step teaching using progressive complexity (simple → layered → realistic). This is usually the heart of the notes for the 1–2 most important subtopics. |
| **Code Example** | Short (5–10 lines) code with plain-English explanation. Keep the code minimal and explain what's happening line-by-line where helpful. |
| **Analogy Box** | A standalone analogy when an abstract idea needs a concrete anchor. Use throughout the notes wherever an idea feels invisible or hard to picture — not just in the intro. |
| **Mermaid Diagram** | A process, workflow, relationship, hierarchy, or before/after that benefits from a visual. Use ```mermaid fencing. Keep it under 8–10 nodes. Always add a one-line caption. |
| **Industry Spotlight** | A short 2–4 sentence callout connecting the concept to real-world jobs or technical interviews. Only include where the transcript content naturally supports it — do not fabricate. Format as a blockquote callout (see rules below). |
| **Common Pitfall** | A brief callout explaining a frequent mistake or misconception students make with this concept, and how to avoid it. Only include when the transcript hints at the pitfall or when it's a well-known trap for this specific topic — do not invent pitfalls. |
| **Comparison Table** | A small markdown table comparing 2–4 related options, approaches, or concepts side-by-side (e.g., "SQL vs NoSQL", "REST vs GraphQL", "Bagging vs Boosting"). Use the same columns across rows. Include when the concept hinges on trade-offs between alternatives. |
| **Mini Case Study** | A short real-world scenario (2–5 sentences) showing the concept applied end-to-end at a named company, product, or system — with a clear setup → problem → resolution arc. Only use when the transcript grounds the example; never fabricate companies or products. Distinct from Industry Spotlight, which is a shorter callout. |
| **Decision Tree / Flow** | A branching diagram (usually a Mermaid flowchart) showing how to pick between options. Use when the subtopic is a "which X should I use?" question. |
| **Try It Yourself** | 1–2 micro-exercises focused on application, with a brief hint (not the answer) for each. Optional — include only when a meaningful micro-exercise exists; skip it otherwise. |
| **Other Add-ons** | Common confusions ("People often mix this up with…"), tips, or cautions for tricky parts. Use sparingly. |

##### Rules for the Modular Middle

- Pick only blocks that genuinely help. Skip anything that would feel forced.
- Order blocks in whatever sequence builds understanding best for this specific topic.
- Use analogies **throughout** the notes (not just in the intro) whenever an idea feels abstract, invisible, or hard to picture. Each analogy must be **original to its subtopic** — do not reuse the same analogy across sections.
- For the 1–2 most important subtopics (the ones students will struggle with most or build on later), use the **progressive complexity** approach in the Detailed Walkthrough: (1) start simple with the most basic example possible, (2) add one layer — an edge case or extra parameter, using the same example, (3) show it in context with a realistic scenario. For remaining subtopics, a single clear example is enough — do not force 3 layers on every concept.
- Honor the critical constraints above (transcript-only scope, no transcript references, factual accuracy) in every block.

#### Anchor 2 — Key Takeaways (mandatory, bottom of output)

End the output with a section titled exactly `### Key Takeaways`.

- 3–5 bullet points capturing what students should remember
- Include a simple mental model: "Think of X as…"
- Do **not** include any "what's coming next" or "future topics" content

## Block Formatting Rules (how each block should look in the OUTPUT)

#### Analogies
- Connect to everyday experiences: cooking, shopping, organizing a closet, sending mail, following a recipe, playing a game, planning a trip
- Brief: 1–2 sentences, directly tied to the concept
- Each analogy must be original to its subtopic — never reused across blocks

#### Mermaid Diagrams
- Use ```mermaid fencing
- Maximum 8–10 nodes per diagram; split into two if larger
- Plain-English labels (no abbreviations students won't know)
- Always include a one-line caption above the diagram explaining what it shows
- Use diagrams for: processes with 3+ steps, components that interact, before/after comparisons, hierarchies/classifications
- Do not force diagrams where a sentence or list would suffice

#### Industry Spotlight blocks
Format as a blockquote callout so it visually stands out:
```markdown
> **Industry Spotlight**
> [2–4 sentences connecting the concept to professional practice or interviews. Grounded in transcript content — never fabricated.]
```

#### Common Pitfall blocks
Format as a blockquote callout:
```markdown
> **Common Pitfall**
> [1–3 sentences naming the mistake and how to avoid it. Only include if the transcript supports it or it's a well-known trap.]
```

#### Comparison Table blocks
Use a small markdown table with a header row and 2–4 data rows. Same columns across rows. Keep cells short (a few words, not paragraphs):
```markdown
| Dimension | Option A | Option B |
|---|---|---|
| ... | ... | ... |
```

#### Mini Case Study blocks
Narrative prose (2–5 sentences) with a clear setup → problem → resolution arc. Name a real company/product/system only if the transcript does. Never fabricate.

#### Code Example blocks
- Short (5–10 lines max)
- Always specify the language on the fence (e.g. ```python, not bare ```)
- Explain what's happening in plain English before or after the block

## Writing Style

Write like you're teaching a curious friend who's new to the subject:

- Short, direct sentences (under 20 words when possible)
- Define terms immediately in plain English
- **Bold** key terms on first occurrence only (variable, function, etc.)
- Break long explanations into bullet points or numbered steps
- Active voice: "Call the function" not "The function is called"
- Include white space between sections for readability
- Keep it friendly and encouraging — avoid intimidating language

## Quality Checklist

Before finalizing, ensure your notes:

- Have both mandatory anchors: `### What You'll Learn` at the top and `### Key Takeaways` at the bottom
- Modular middle uses blocks chosen to fit the specific topic — not a fixed checklist, and not every block forced in
- Cover only subtopics from the transcript; no invented content
- Never reference "the transcript", "the lecture", "the speaker", or "the session"
- Silently correct any factual errors in the transcript using accurate domain knowledge
- Build on prerequisite knowledge without unnecessary repetition
- Use original analogies throughout (not reused across blocks)
- Apply progressive complexity (simple → layered → realistic) only for the 1–2 most important subtopics
- Include Mermaid diagrams where a process, relationship, or comparison genuinely benefits from a visual — with captions and ```mermaid fencing
- Include Industry Spotlights only where the transcript naturally supports them — never fabricated
- Include Common Pitfall, Comparison Table, Mini Case Study, or Decision Tree blocks where they genuinely help — skip if forced
- Key Takeaways contain 3–5 bullets + a "Think of X as…" mental model, and do NOT include "what's coming next" content
- Are a 10–20 minute read — trim any section that repeats information without new insight
- Use consistent ### headers, proper code-block language fencing, and adequate white space

Write your complete lecture notes now. Your output should be the finished lecture notes ready for students to read — do not include meta-commentary, planning notes, or references to these instructions. Return the results in formatted Markdown.
