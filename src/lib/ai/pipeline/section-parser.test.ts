import { describe, it, expect } from 'vitest';
import { headerCore, parseSections, mergeSectionPatches, buildCodeFenceMask, Section } from './section-parser';

// ---------------------------------------------------------------------------
// headerCore
// ---------------------------------------------------------------------------
describe('headerCore', () => {
  it('strips numbered prefix (digit + dot)', () => {
    expect(headerCore('4. Practice Exercises')).toBe('practice exercises');
  });

  it('strips lettered prefix (letter + dot)', () => {
    expect(headerCore('A. Introduction')).toBe('introduction');
  });

  it('strips lettered prefix (letter + paren)', () => {
    expect(headerCore('B) Overview')).toBe('overview');
  });

  it('strips "Step N:" prefix', () => {
    expect(headerCore('Step 1: Foo')).toBe('foo');
  });

  it('strips "Part N:" prefix', () => {
    expect(headerCore('Part 2: Bar')).toBe('bar');
  });

  it('strips "Section N -" prefix', () => {
    expect(headerCore('Section 3 - Baz')).toBe('baz');
  });

  it('strips "Section N)" prefix', () => {
    expect(headerCore('Section 5) Details')).toBe('details');
  });

  it('strips bold markdown (**text**)', () => {
    expect(headerCore('**Foo**')).toBe('foo');
  });

  it('strips italic markdown (*text*)', () => {
    expect(headerCore('*Introduction*')).toBe('introduction');
  });

  it('strips inline code markers', () => {
    expect(headerCore('`Code`')).toBe('code');
  });

  it('handles combined bold + numbering', () => {
    expect(headerCore('**3. Summary**')).toBe('summary');
  });

  it('returns lowercased, trimmed string for plain header', () => {
    expect(headerCore('  Key Concepts  ')).toBe('key concepts');
  });

  it('handles empty string', () => {
    expect(headerCore('')).toBe('');
  });

  it('handles "Step" prefix with dash separator', () => {
    expect(headerCore('Step 7 - Configuration')).toBe('configuration');
  });
});

// ---------------------------------------------------------------------------
// buildCodeFenceMask
// ---------------------------------------------------------------------------
describe('buildCodeFenceMask', () => {
  it('returns all-false for text with no code fences', () => {
    const text = 'Hello world';
    const mask = buildCodeFenceMask(text);
    expect(mask.every(v => v === false)).toBe(true);
  });

  it('masks content inside code fences as true', () => {
    const text = 'before\n```\ninside\n```\nafter';
    const mask = buildCodeFenceMask(text);
    const fenceStart = text.indexOf('```');
    const fenceEndLine = text.indexOf('```', fenceStart + 3);
    const afterNewline = text.indexOf('\n', fenceEndLine) + 1;
    // Everything from first ``` to end of closing ``` line should be true
    for (let i = fenceStart; i < afterNewline; i++) {
      expect(mask[i]).toBe(true);
    }
    // Content after closing fence should be false
    for (let i = afterNewline; i < text.length; i++) {
      expect(mask[i]).toBe(false);
    }
  });

  it('marks unclosed fence through end of text', () => {
    const text = 'before\n```\ncode here';
    const mask = buildCodeFenceMask(text);
    const fenceStart = text.indexOf('```');
    for (let i = fenceStart; i < text.length; i++) {
      expect(mask[i]).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// parseSections
// ---------------------------------------------------------------------------
describe('parseSections', () => {
  it('returns empty array for empty input', () => {
    expect(parseSections('')).toEqual([]);
  });

  it('returns empty array for text with no ### headers', () => {
    const text = 'Some paragraph\nAnother line';
    expect(parseSections(text)).toEqual([]);
  });

  it('parses a single section', () => {
    const text = '### Introduction\nThis is the intro content.';
    const sections = parseSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].header).toBe('Introduction');
    expect(sections[0].body).toBe('This is the intro content.');
  });

  it('parses multiple sections', () => {
    const text = `### Overview
Overview content here.

### Details
Detail content here.

### Conclusion
Final words.`;

    const sections = parseSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0].header).toBe('Overview');
    expect(sections[0].body).toContain('Overview content');
    expect(sections[1].header).toBe('Details');
    expect(sections[1].body).toContain('Detail content');
    expect(sections[2].header).toBe('Conclusion');
    expect(sections[2].body).toBe('Final words.');
  });

  it('ignores ### headers inside code fences', () => {
    const text = `### Real Section
Some text

\`\`\`
### This is inside a code block
should be ignored
\`\`\`

### Another Real Section
More text`;

    const sections = parseSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header).toBe('Real Section');
    expect(sections[1].header).toBe('Another Real Section');
    // The code-fenced content should appear in the first section's body
    expect(sections[0].body).toContain('### This is inside a code block');
  });

  it('handles sections with empty bodies', () => {
    const text = `### First
### Second
Content for second`;

    const sections = parseSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header).toBe('First');
    expect(sections[0].body).toBe('');
    expect(sections[1].header).toBe('Second');
    expect(sections[1].body).toBe('Content for second');
  });

  it('trims whitespace from header and body', () => {
    const text = `###   Padded Header

  Body with leading space.`;

    const sections = parseSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].header).toBe('Padded Header');
    expect(sections[0].body).toBe('Body with leading space.');
  });
});

// ---------------------------------------------------------------------------
// mergeSectionPatches
// ---------------------------------------------------------------------------
describe('mergeSectionPatches', () => {
  it('returns base content when patches string is empty', () => {
    const base = '### Intro\nHello world';
    expect(mergeSectionPatches(base, '')).toBe(base);
    expect(mergeSectionPatches(base, '   ')).toBe(base);
  });

  it('replaces section body on exact header match', () => {
    const base = `### Introduction
Old intro content.

### Details
Old detail content.`;

    const patches = `### Details
New detail content.`;

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('### Introduction');
    expect(result).toContain('Old intro content.');
    expect(result).toContain('### Details');
    expect(result).toContain('New detail content.');
    expect(result).not.toContain('Old detail content.');
  });

  it('matches sections fuzzily (strips numbering)', () => {
    const base = `### 1. Introduction
Old intro.

### 2. Practice Exercises
Old exercises.`;

    const patches = `### Practice Exercises
Updated exercises.`;

    const result = mergeSectionPatches(base, patches);
    // Should match "2. Practice Exercises" via fuzzy match
    expect(result).toContain('### 2. Practice Exercises');
    expect(result).toContain('Updated exercises.');
    expect(result).not.toContain('Old exercises.');
    // Original header numbering preserved
    expect(result).toContain('### 1. Introduction');
    expect(result).toContain('Old intro.');
  });

  it('appends new sections that do not match any base section', () => {
    const base = `### Existing Section
Existing content.`;

    const patches = `### Brand New Section
New content here.`;

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('### Existing Section');
    expect(result).toContain('Existing content.');
    expect(result).toContain('### Brand New Section');
    expect(result).toContain('New content here.');
  });

  it('replaces preamble (text before first ###) when patch has preamble', () => {
    const base = `Old preamble text.

### Section A
Content A.`;

    const patches = `New preamble text.

### Section A
Updated A.`;

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('New preamble text.');
    expect(result).not.toContain('Old preamble text.');
    expect(result).toContain('Updated A.');
  });

  it('preserves preamble when patch has no preamble', () => {
    const base = `Important preamble.

### Section
Old body.`;

    const patches = `### Section
New body.`;

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('Important preamble.');
    expect(result).toContain('New body.');
  });

  it('handles multiple patches at once', () => {
    const base = `### A
Alpha

### B
Bravo

### C
Charlie`;

    const patches = `### B
Bravo Updated

### C
Charlie Updated`;

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('Alpha');
    expect(result).toContain('Bravo Updated');
    expect(result).not.toContain('\nBravo\n');
    expect(result).toContain('Charlie Updated');
    expect(result).not.toContain('\nCharlie\n');
  });

  it('handles CRLF line endings', () => {
    const base = '### Intro\r\nOld text.';
    const patches = '### Intro\r\nNew text.';

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('New text.');
    expect(result).not.toContain('Old text.');
  });

  it('returns patch content when base has no sections and patch has no sections', () => {
    const base = 'Just some text, no headings.';
    const patches = 'Replacement text.';

    const result = mergeSectionPatches(base, patches);
    expect(result).toContain('Replacement text.');
  });
});

// ---------------------------------------------------------------------------
// mergeSectionPatches — ## top-level patches
// ---------------------------------------------------------------------------
describe('mergeSectionPatches — ## top-level patches', () => {
  it('applies a ## patch to the correct block in base content', () => {
    const base = [
      '## What You\'ll Learn',
      'Old learning content.',
      '',
      '## Detailed Explanation',
      'Old explanation content.',
    ].join('\n');

    const patch = [
      '## What You\'ll Learn',
      'New learning content.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    expect(result).toContain('## What You\'ll Learn');
    expect(result).toContain('New learning content.');
    expect(result).not.toContain('Old learning content.');
    // Other section preserved
    expect(result).toContain('## Detailed Explanation');
    expect(result).toContain('Old explanation content.');
  });

  it('does not affect other ## sections', () => {
    const base = [
      '## What You\'ll Learn',
      'Old learn.',
      '',
      '## Detailed Explanation',
      'Old detail.',
      '',
      '## What\'s Coming Next',
      'Old next.',
      '',
      '## Practice Exercises',
      'Old exercises.',
    ].join('\n');

    const patch = [
      '## Detailed Explanation',
      'New detail.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    expect(result).toContain('New detail.');
    expect(result).not.toContain('Old detail.');
    // All other sections untouched
    expect(result).toContain('Old learn.');
    expect(result).toContain('Old next.');
    expect(result).toContain('Old exercises.');
  });

  it('handles mixed ## and ### patches independently', () => {
    const base = [
      '## What You\'ll Learn',
      'Old learn.',
      '',
      '## Detailed Explanation',
      '',
      '### Key Concept',
      'Old concept.',
      '',
      '### Another Concept',
      'Old another.',
    ].join('\n');

    const patch = [
      '## What You\'ll Learn',
      'New learn.',
      '',
      '### Key Concept',
      'New concept.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    expect(result).toContain('New learn.');
    expect(result).not.toContain('Old learn.');
    expect(result).toContain('New concept.');
    expect(result).not.toContain('Old concept.');
    expect(result).toContain('Old another.');
  });

  it('does not corrupt preamble when patch contains ## blocks', () => {
    const base = [
      '## What You\'ll Learn',
      'Old learn.',
      '',
      '## Detailed Explanation',
      'Old detail.',
    ].join('\n');

    // Patch contains only a ## block — no ### preamble replacement should occur
    const patch = [
      '## Detailed Explanation',
      'New detail.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    // The ## What You'll Learn block must still be there, untouched
    expect(result).toContain('## What You\'ll Learn');
    expect(result).toContain('Old learn.');
    // The patched section has the new content
    expect(result).toContain('## Detailed Explanation');
    expect(result).toContain('New detail.');
    expect(result).not.toContain('Old detail.');
  });

  it('ignores ## patch with no matching header in base', () => {
    const base = [
      '## What You\'ll Learn',
      'Learn content.',
      '',
      '## Detailed Explanation',
      'Explanation content.',
    ].join('\n');

    const patch = [
      '## Nonexistent Section',
      'Some content.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    // Base unchanged
    expect(result).toContain('Learn content.');
    expect(result).toContain('Explanation content.');
    expect(result).not.toContain('Nonexistent Section');
    expect(result).not.toContain('Some content.');
  });

  it('ignores ## patch with empty body', () => {
    const base = [
      '## What You\'ll Learn',
      'Learn content.',
      '',
      '## Detailed Explanation',
      'Explanation content.',
    ].join('\n');

    // Patch header with no body (just whitespace before next section)
    const patch = [
      '## What You\'ll Learn',
      '',
      '## Detailed Explanation',
      'New explanation.',
    ].join('\n');

    const result = mergeSectionPatches(base, patch);
    // Empty-body patch for What You'll Learn is ignored
    expect(result).toContain('Learn content.');
    // Non-empty patch for Detailed Explanation is applied
    expect(result).toContain('New explanation.');
    expect(result).not.toContain('Explanation content.');
  });
});
