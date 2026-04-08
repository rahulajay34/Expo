You will be creating pre-read educational content for complete beginners. Pre-reads are introductory materials designed to give students foundational awareness of a topic before they dive deeper into learning it. Your goal is to take students from 0 to 10 on a 100-point knowledge scale—building orientation and curiosity, not mastery.

Here is the topic you'll be creating pre-read content for:

<topic>
{{TOPIC}}
</topic>

Here are the subtopics that should be covered within this pre-read:

<subtopics>
{{SUBTOPICS}}
</subtopics>

Here are the prerequisites—the knowledge students already have before starting this pre-read:

<prerequisites>
{{PREREQUISITES}}
</prerequisites>

Below are the complete guidelines you must follow when creating this pre-read content:

<guidelines>

# Pre-Read Content Creation Guidelines

## Core Principles

- **Audience**: Complete beginners with only prerequisite knowledge
- **Goal**: Build foundational awareness (0→10 on 100-point scale), not mastery
- **Success**: Student feels oriented, curious, and ready to explore deeper
- **Tone**: Simple, conversational, encouraging—like explaining to a friend

## Structure

The pre-read has four mandatory top-level sections, in this exact order:

1. `## What You'll Learn` (top)
2. `## Detailed Explanation` (the modular middle — uses subsections A–I flexibly)
3. `## What's Coming Next` (bridge to the live session)
4. `## Practice Exercises` (curiosity-first, hard-capped at 4 total)

### 1. What You'll Learn (3-4 bullets)

- Start with "In this pre-read, you'll discover:"
- Use action words: discover, understand, learn
- Keep promises specific and jargon-free

### 2. Detailed Explanation

_Note: Use any of these subsections wherever they naturally fit—there's no need to force them all in. The main goal is to make sure students clearly understand the concept, so feel free to include/exclude subsections only when they help with clarity and comprehension. However, **Common Misconceptions (G)** and **Mermaid Diagram (I)** are mandatory unless the topic genuinely cannot support them._

#### A. Introduction: "What Is [Topic]?"

- Start with everyday analogy (cooking, phones, shopping, etc.)
- Define concept in ONE simple sentence after analogy
- **Technical**: Use pseudo-code first
- **Non-Technical**: Use mini-story first

#### B. Importance: "Why Does [Topic] Matter?"

- List exactly 3 benefits with 1-2 sentence explanations
- Frame as problems solved or improvements gained
- Use "you" language

#### C. Building Understanding: "From Known to New"

- Show the "painful way" using only prerequisites
- Introduce new concept as the solution
- **Technical**: Show repetitive code → simplified code
- **Non-Technical**: Show inefficient scenario → improved scenario

#### D. Core Components

- Break into 3-5 main parts maximum
- Each gets: simple name + one sentence + micro-example
- **Technical**: Show syntax structure
- **Non-Technical**: Use simple framework

#### E. Step-by-Step Process

- 3-5 numbered steps
- One action per step
- **Technical**: Include minimal code per step
- **Non-Technical**: Progress mini case study through steps

#### F. Key Features

- Maximum 2-3 features
- Only if essential for basics
- Include simple example for each

#### G. Common Misconceptions: "What [Topic] is NOT" _(mandatory)_

- Include 2-3 common misconceptions beginners typically have about this topic
- For each misconception, state the wrong belief and then briefly clarify the reality
- Frame gently—use language like "A common mix-up is..." or "You might assume... but actually..." rather than making the reader feel wrong
- This section helps prevent wrong mental models before students go deeper into the topic

#### H. Putting It All Together

- ONE complete example using prerequisites + new concept
- **Technical**: 10-15 lines of code maximum
- **Non-Technical**: Complete mini case study with outcome

#### I. Visual Overview (Mermaid Diagram) _(mandatory)_

- Include **at least one Mermaid diagram** to visually represent a key concept, process, or relationship from the topic
- Choose the diagram type that best fits the concept:
  - **Flowchart**: For processes, decision flows, or step-by-step logic
  - **Sequence diagram**: For interactions between components or systems
  - **Mindmap**: For showing how sub-concepts relate to the main topic
  - **Block diagram**: For architecture or component relationships
- Keep diagrams simple—no more than 8-10 nodes/steps. The goal is clarity, not completeness
- Place the diagram where it adds the most value (e.g., after explaining a process, or as a summary of core components)
- Add a one-line caption above the diagram explaining what it shows (e.g., "Here's how the main parts of [Topic] connect:")
- Use the standard Mermaid syntax inside a fenced code block marked as `mermaid`

### 3. What's Coming Next (Session Teaser)

- Include a brief closing section (3-5 sentences) that bridges the pre-read to the upcoming session
- Mention 2-3 specific things students will explore in the deeper session (hands-on practice, real-world applications, advanced features, etc.)
- Frame it as a natural continuation: "Now that you understand [basics], in our session we'll..."
- End with an encouraging, momentum-building line that makes students look forward to learning more
- **Do NOT introduce new concepts here**—only tease what's ahead using language they already understand from the pre-read

### 4. Practice Exercises (curiosity-first, hard-capped at 4)

Pre-read exercises are **curiosity engines**, not assessments. Every exercise must make the student ask *"wait — why is this concept even needed?"* and feel pulled toward the upcoming live session. They must never feel like a quiz or a recall check.

#### Hard cap on quantity

- **Maximum 4 exercises total**: up to **3 main exercises + at most 1 optional Follow-Along Activity**. Never 5. Never more.
- The exact count is **dynamic** — pick only as many as the topic genuinely supports. Fewer is fine. **1 strong exercise is better than 3 weak ones.** Never pad to hit the cap.
- The Follow-Along Activity is **genuinely optional**. Include it only when the topic naturally invites a hands-on do-it-yourself mini task. If you cannot design one that is simple, safe, and revealing for a complete beginner, **skip it entirely** — do not force one in.

#### Curiosity-first framing (mandatory for every exercise)

- Every exercise must **open with a curiosity hook**, not a recall prompt. Phrases like "Recall the definition of…", "List the three types of…", or "What is…" are forbidden as openers.
- Instead, open with something that provokes *"huh, why does this even exist?"* — e.g. "Imagine you tried to…", "Look around you right now and…", "Suppose your phone had to…".
- Exercises should surface the *need* for the concept, not test whether it was memorized.

#### Main exercise types (pick 1–3 that fit the topic)

You do not need to use all of these, and you do not need to use them in any particular order. Pick whichever best fit the specific subtopics. What matters is that each chosen exercise provokes curiosity and points forward to the live session.

1. **Why Does This Matter?** — Present a relatable everyday situation that *fails* without the concept. Ask "What's missing here? What would you wish existed?" Make the student invent the need for the concept themselves.
2. **Spot It in Real Life** — Ask the student to find the concept in their own surroundings (apps they use, things at home, daily routines). Creates a "huh, it's been here all along" moment.
3. **Live-Session Teaser** — Pose a question or mini-puzzle the student can *partially* reason about using the pre-read, but which clearly has depth they can't fully crack yet. Explicitly hint that "we'll go deeper on this in the live session".
4. **Pattern Recognition** — Show two or three everyday situations and ask the student which ones quietly rely on the concept. Goal: make them notice the concept is everywhere once you know to look.
5. **Planning Ahead** — Give a simple fresh scenario and ask how they'd *try* to apply the concept. No correct answer needed — the goal is to let them feel where their knowledge runs out and want more.

Each main exercise must include:
- A **curiosity-first opening** (see above)
- A short **Hint:** line for students who get stuck

#### Optional Follow-Along Activity (4th slot only)

Only include this if the topic naturally supports a hands-on mini task a complete beginner can do in **2–5 minutes with everyday tools only** (phone, browser, paper, kitchen items, pen, stopwatch). **No code. No specialized software. No account sign-ups.**

Format the Follow-Along exactly like this:

- **Activity name** (one short line)
- **What you'll do** — 3–6 numbered steps in plain English
- **What to notice** — 1–2 sentences pointing at the "aha" moment
- **Expected Outcome** — a description of what the student should observe or feel afterward (NOT a rigid answer key)

If you cannot design a Follow-Along that is genuinely simple, safe, and revealing for a complete beginner, **skip it entirely**. Do not invent one just to reach 4 exercises.

#### Answer Key & live-session hook (mandatory)

After the main exercises, include a short **Answer Key / Explanation** section covering each main exercise. Rules:

- The Follow-Along Activity does **not** get an answer key entry — its "Expected Outcome" line lives inside the activity itself.
- Every main-exercise answer must end with a **one-line hook pulling the student toward the live session**, e.g. "You'll see exactly how this plays out in our session." or "We'll unpack the full picture in the upcoming session." This hook is mandatory — do not skip it.
- Avoid answers that are a direct copy-paste from the pre-read content. The answer should reward thinking, not memorization.

</guidelines>

## Style Guide

### Language Rules

- 8th-grade reading level
- Max 20 words per sentence for complex ideas
- Explain every technical term immediately
- Active voice, direct, conversational

### Formatting

- **Bold** key terms (first occurrence)
- Use bullets for lists
- Include white space
- Keep paragraphs to 3-4 sentences

### Examples to Use

- Good: Daily routines, phone apps, food/cooking, shopping, games
- Avoid: Complex business scenarios, culturally specific references, abstract metaphors

## Quality Checklist

- [ ] 10-15 minute read (approximately 1500-2500 words)
- [ ] Uses ONLY prerequisites + new topic
- [ ] 3+ relatable analogies
- [ ] Every section under 500 words
- [ ] Zero unexplained jargon
- [ ] At least one Mermaid diagram that clarifies a key concept
- [ ] Common Misconceptions section present with 2-3 gentle clarifications
- [ ] `## What's Coming Next` section bridges to the deeper session without introducing new concepts
- [ ] Practice Exercises section has **at most 4 items total** (up to 3 main + at most 1 optional Follow-Along) — never 5
- [ ] Every exercise opens with a curiosity hook, not recall phrasing
- [ ] Each main exercise has a **Hint:** line
- [ ] Each main-exercise answer key entry ends with a one-line hook to the live session
- [ ] If a Follow-Along exists, it uses everyday tools only and ends with an "Expected Outcome" (not an answer key)
- [ ] Creates curiosity, not confusion

## Common Mistakes

1. **Information overload** - Remember: introduction, not comprehensive guide
2. **Assuming knowledge** - Only use listed prerequisites
3. **Too abstract** - Always use concrete examples
4. **Long sections** - Break up with headers and bullets
5. **Intimidating tone** - Keep it friendly and approachable
6. **Recall-style exercises** - Exercises must provoke curiosity, not test memorization
7. **Padding to 4 exercises** - 1 strong exercise beats 3 weak ones. Never invent a Follow-Along just to hit the cap
8. **Overloaded diagrams** - Keep Mermaid diagrams simple; if it needs more than 10 nodes, split into two diagrams or simplify

## Remember

You're writing a friendly introduction. Success = "I understand the basics and want to learn more!"

---

Now, follow these instructions to create the pre-read content:

1. **Review the prerequisites carefully**: You may ONLY assume students know what's listed in the prerequisites. Do not assume any other knowledge. Build everything from this foundation.
2. **Incorporate all subtopics naturally**: Weave the provided subtopics into your detailed explanation. They should flow naturally within the structure, not feel forced or listed separately.
3. **Apply the structure flexibly**: Follow the four-part structure (What You'll Learn → Detailed Explanation → What's Coming Next → Practice Exercises), but within the Detailed Explanation section, only use the subsections (A through I) that naturally fit. Don't force all subsections if they don't serve clarity. However, **Common Misconceptions (G)** and **Visual Overview / Mermaid Diagram (I)** are mandatory.
4. **Choose appropriate examples**: Determine whether the topic is technical or non-technical, then use the appropriate example types (pseudo-code/code for technical; mini-stories/case studies for non-technical).
5. **Maintain the right level**: This is an introduction (0→10 on a 100-point scale). Avoid going too deep. Focus on building awareness and curiosity, not comprehensive understanding.
6. **Use relatable analogies**: Include at least 3 analogies throughout the content using everyday concepts like cooking, phones, shopping, games, or daily routines.
7. **Create curiosity-first practice exercises**:
   - Output **at most 4 exercises total**: up to 3 main exercises plus at most 1 optional Follow-Along Activity. Never 5. Never more.
   - The count is dynamic — fewer is fine. 1 strong exercise beats 3 weak ones. Never pad.
   - Every exercise must open with a curiosity hook ("Imagine…", "Look around…", "Suppose…") — never with recall phrasing ("Recall…", "List…", "Define…").
   - Each main exercise gets a **Hint:** line.
   - Include an **Answer Key / Explanation** section at the end. Every main-exercise answer must finish with a one-line hook pulling the student toward the live session.
   - The Follow-Along (if included) gets an **Expected Outcome** line *inside* the activity — not an answer key entry. Skip the Follow-Along entirely if you can't design one that is simple, safe, and revealing with everyday tools only (no code, no specialized software).
8. **Include at least one Mermaid diagram**: Choose the diagram type that best represents a key concept or process. Keep it simple and place it where it adds the most clarity.
9. **Address common misconceptions**: Include 2-3 things the topic is commonly confused with or misunderstood as, and gently correct them.
10. **Bridge to the session**: End with a "What's Coming Next" teaser that builds anticipation for the deeper session without introducing new concepts.
11. **Format in markdown**: Use proper markdown formatting with headers (##, ###), **bold** for key terms, bullets, Mermaid code blocks, and adequate white space.
12. **Keep it friendly**: Write as if explaining to a friend. Be encouraging and conversational throughout.
13. **Verify quality**: Before finalizing, mentally check against the quality checklist to ensure all criteria are met — especially the exercise cap of 4 and the curiosity-first framing.

Write your complete pre-read content in markdown format. The content should be ready to use as-is, requiring no additional editing. Include all four main sections: What You'll Learn, Detailed Explanation (with appropriate subsections), What's Coming Next, and Practice Exercises.

Your output should be the complete, polished pre-read content formatted in markdown, ready for students to read. Return the results in formatted Markdown.
