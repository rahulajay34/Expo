import { describe, it, expect } from 'vitest';
import { parseAssignmentMarkdown } from './csv';

describe('parseAssignmentMarkdown', () => {
  // -----------------------------------------------------------------------
  // MCQ (single-correct)
  // -----------------------------------------------------------------------
  describe('MCQ questions', () => {
    it('parses a basic MCQ question with explicit (MCQ) type', () => {
      const md = `### Question 1 (MCQ)

What is 2 + 2?

A) 3
B) 4
C) 5
D) 6

**Correct Answer:** B

**Difficulty:** 1

**Explanation:** Basic arithmetic.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row.questionType).toBe('mcsc');
      expect(row.contentBody).toContain('What is 2 + 2?');
      expect(row['option.1']).toBe('3');
      expect(row['option.2']).toBe('4');
      expect(row['option.3']).toBe('5');
      expect(row['option.4']).toBe('6');
      expect(row.mcscAnswer).toBe('2'); // B = 2
      expect(row.difficultyLevel).toBe('0.5'); // 1 maps to 0.5
      expect(row.answerExplanation).toBe('Basic arithmetic.');
    });

    it('detects MCQ from content when header has no type annotation', () => {
      const md = `## Question 1

Which planet is closest to the sun?

A) Venus
B) Mercury
C) Mars
D) Jupiter

**Correct Answer:** B`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].questionType).toBe('mcsc');
      expect(rows[0].mcscAnswer).toBe('2'); // B
    });

    it('handles bold option formatting (**A)**)', () => {
      const md = `### Question 1 (MCQ)

Pick the right answer.

**A)** Alpha
**B)** Beta
**C)** Gamma
**D)** Delta

**Correct Answer:** C

**Difficulty:** 2`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0]['option.1']).toBe('Alpha');
      expect(rows[0]['option.3']).toBe('Gamma');
      expect(rows[0].mcscAnswer).toBe('3'); // C
      expect(rows[0].difficultyLevel).toBe('1'); // 2 maps to 1
    });

    it('maps difficulty 0 to "0"', () => {
      const md = `### Question 1 (MCQ)

Easy question?

A) Yes
B) No
C) Maybe
D) Sure

**Correct Answer:** A
**Difficulty:** 0`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows[0].difficultyLevel).toBe('0');
    });

    it('maps difficulty 3 to "1"', () => {
      const md = `### Question 1 (MCQ)

Hard question?

A) Yes
B) No
C) Maybe
D) Sure

**Correct Answer:** D
**Difficulty:** 3`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows[0].difficultyLevel).toBe('1');
    });
  });

  // -----------------------------------------------------------------------
  // MSQ (multi-correct)
  // -----------------------------------------------------------------------
  describe('MSQ questions', () => {
    it('parses MSQ with multiple correct answers', () => {
      const md = `### Question 1 (MSQ)

Which are prime numbers?

A) 2
B) 4
C) 3
D) 9

**Correct Answers:** A and C

**Difficulty:** 2

**Explanation:** 2 and 3 are prime. 4 = 2x2, 9 = 3x3.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row.questionType).toBe('mcmc');
      expect(row.mcmcAnswer).toBe('1, 3'); // A=1, C=3
      expect(row.answerExplanation).toContain('prime');
    });

    it('detects MSQ from content with multiple correct answers and no header type', () => {
      const md = `**Question 1**

Select all that apply.

A) Option one
B) Option two
C) Option three
D) Option four

**Correct Answers:** A, B, D`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].questionType).toBe('mcmc');
      expect(rows[0].mcmcAnswer).toBe('1, 2, 4'); // A=1, B=2, D=4
    });

    it('does not confuse letters in "and" with answer letters', () => {
      const md = `### Question 1 (MSQ)

Pick correct.

A) First
B) Second
C) Third
D) Fourth

**Correct Answers:** A and C`;

      const rows = parseAssignmentMarkdown(md);
      // Should only get A and C, not extract 'a' and 'd' from "and"
      expect(rows[0].mcmcAnswer).toBe('1, 3');
    });
  });

  // -----------------------------------------------------------------------
  // Subjective
  // -----------------------------------------------------------------------
  describe('Subjective questions', () => {
    it('parses a basic subjective question', () => {
      const md = `### Question 1 (Subjective)

Design a REST API for a todo application.

**Deliverables:**
- API endpoint list
- Data model

**Evaluation Criteria:**
- Completeness
- RESTful design

**Model Answer:**
The API should include GET /todos, POST /todos, PUT /todos/:id, DELETE /todos/:id.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row.questionType).toBe('subjective');
      expect(row.contentType).toBe('markdown');
      expect(row.difficultyLevel).toBe('1'); // always hard for subjective
      expect(row.contentBody).toContain('Design a REST API');
      expect(row.contentBody).toContain('Deliverables');
      expect(row.contentBody).toContain('Evaluation Criteria');
      // Model answer goes into explanation, not body
      expect(row.contentBody).not.toContain('GET /todos');
      expect(row.answerExplanation).toContain('GET /todos');
    });

    it('detects subjective from content labels when header has no type', () => {
      const md = `## Question 1

Write a function to reverse a linked list.

**Deliverables:**
- Working code

**Model Answer:**
Use iterative pointer reversal.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].questionType).toBe('subjective');
    });

    it('handles "Editorial Solution" as the answer marker', () => {
      const md = `### Question 1 (Subjective)

Explain polymorphism.

**Deliverables:**
- Clear explanation

**Editorial Solution:**
Polymorphism allows objects of different types to be treated uniformly.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].answerExplanation).toContain('Polymorphism allows');
    });

    it('handles "Reference Solution" as the answer marker', () => {
      const md = `### Question 1 (Subjective)

Implement quicksort.

**Reference Solution:**
Quicksort uses divide-and-conquer with a pivot element.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].answerExplanation).toContain('Quicksort uses');
    });
  });

  // -----------------------------------------------------------------------
  // Multiple questions
  // -----------------------------------------------------------------------
  describe('multiple questions in one document', () => {
    it('parses a mix of MCQ, MSQ, and subjective', () => {
      const md = `### Question 1 (MCQ)

What is 1+1?

A) 1
B) 2
C) 3
D) 4

**Correct Answer:** B
**Difficulty:** 0

---

### Question 2 (MSQ)

Pick even numbers.

A) 2
B) 3
C) 4
D) 5

**Correct Answers:** A, C
**Difficulty:** 1

---

### Question 3 (Subjective)

Explain recursion.

**Deliverables:**
- Definition and example

**Model Answer:**
Recursion is when a function calls itself.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(3);
      expect(rows[0].questionType).toBe('mcsc');
      expect(rows[1].questionType).toBe('mcmc');
      expect(rows[2].questionType).toBe('subjective');
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseAssignmentMarkdown('')).toEqual([]);
    });

    it('returns empty array when no questions found', () => {
      const md = '# Just a heading\n\nSome random content with no questions.';
      expect(parseAssignmentMarkdown(md)).toEqual([]);
    });

    it('skips unrecognisable question blocks', () => {
      const md = `### Question 1

Just some text with no options, no answer labels, and no subjective markers.`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toEqual([]);
    });

    it('strips question header text from body', () => {
      const md = `### Question 1 (MCQ)

What is 5 * 5?

A) 20
B) 25
C) 30
D) 35

**Correct Answer:** B`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows[0].contentBody).not.toMatch(/^Question\s+1/i);
    });

    it('all CSVRow fields are present (spread with EMPTY_ROW)', () => {
      const md = `### Question 1 (MCQ)

Sample?

A) 1
B) 2
C) 3
D) 4

**Correct Answer:** A`;

      const rows = parseAssignmentMarkdown(md);
      const row = rows[0];
      // Verify essential fields exist
      expect(row).toHaveProperty('questionType');
      expect(row).toHaveProperty('contentType');
      expect(row).toHaveProperty('contentBody');
      expect(row).toHaveProperty('intAnswer');
      expect(row).toHaveProperty('prepTime(in_seconds)');
      expect(row).toHaveProperty('floatAnswer.max');
      expect(row).toHaveProperty('floatAnswer.min');
      expect(row).toHaveProperty('fitbAnswer');
      expect(row).toHaveProperty('mcscAnswer');
      expect(row).toHaveProperty('subjectiveAnswer');
      expect(row).toHaveProperty('option.1');
      expect(row).toHaveProperty('option.2');
      expect(row).toHaveProperty('option.3');
      expect(row).toHaveProperty('option.4');
      expect(row).toHaveProperty('mcmcAnswer');
      expect(row).toHaveProperty('tagRelationships');
      expect(row).toHaveProperty('difficultyLevel');
      expect(row).toHaveProperty('answerExplanationType');
      expect(row).toHaveProperty('answerExplanation');
    });

    it('handles question body with code blocks', () => {
      const md = `### Question 1 (MCQ)

What does this code print?

\`\`\`python
print("hello")
\`\`\`

A) hello
B) "hello"
C) Error
D) None

**Correct Answer:** A`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows).toHaveLength(1);
      expect(rows[0].contentBody).toContain('```python');
      expect(rows[0].contentType).toBe('markdown');
    });

    it('sets contentType to markdown when body has markdown formatting', () => {
      const md = `### Question 1 (MCQ)

What is the output of \`console.log("test")\`?

A) test
B) "test"
C) undefined
D) Error

**Correct Answer:** A`;

      const rows = parseAssignmentMarkdown(md);
      expect(rows[0].contentType).toBe('markdown');
    });
  });
});
