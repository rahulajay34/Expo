import { describe, it, expect } from 'vitest';
import { extractMermaidBlocks, MermaidBlock } from './mermaid';

describe('extractMermaidBlocks', () => {
  it('returns empty array for empty string', () => {
    expect(extractMermaidBlocks('')).toEqual([]);
  });

  it('returns empty array when no mermaid blocks exist', () => {
    const md = `# Heading

Some paragraph text.

\`\`\`javascript
const x = 1;
\`\`\`
`;
    expect(extractMermaidBlocks(md)).toEqual([]);
  });

  it('extracts a single mermaid block', () => {
    const md = `Some text

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

More text`;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].index).toBe(0);
    expect(blocks[0].source).toBe('graph TD\n  A --> B');
    expect(blocks[0].start).toBe(md.indexOf('```mermaid'));
    expect(blocks[0].end).toBe(md.indexOf('```\n\nMore') + 3);
  });

  it('extracts multiple mermaid blocks with correct indices', () => {
    const md = `\`\`\`mermaid
graph LR
  X --> Y
\`\`\`

Text between blocks

\`\`\`mermaid
sequenceDiagram
  A->>B: Hello
\`\`\`
`;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].index).toBe(0);
    expect(blocks[0].source).toBe('graph LR\n  X --> Y');
    expect(blocks[1].index).toBe(1);
    expect(blocks[1].source).toBe('sequenceDiagram\n  A->>B: Hello');
  });

  it('handles mermaid blocks with trailing spaces after fence markers', () => {
    const md = `\`\`\`mermaid
pie
  "A" : 30
  "B" : 70
\`\`\`   `;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe('pie\n  "A" : 30\n  "B" : 70');
  });

  it('ignores non-mermaid code fences', () => {
    const md = `\`\`\`python
print("hello")
\`\`\`

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`javascript
const x = 1;
\`\`\``;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe('graph TD\n  A --> B');
  });

  it('does not match mermaid blocks that are indented (not at start of line)', () => {
    const md = `Some text
    \`\`\`mermaid
    graph TD
      A --> B
    \`\`\`
`;
    // The regex requires ^```mermaid, so indented blocks should not match
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(0);
  });

  it('handles blocks with empty content', () => {
    const md = `\`\`\`mermaid

\`\`\``;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe('');
  });

  it('handles Windows-style line endings (CRLF)', () => {
    const md = '```mermaid\r\ngraph TD\r\n  A --> B\r\n```';

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe('graph TD\r\n  A --> B');
  });

  it('correctly reports start and end offsets', () => {
    const prefix = 'Hello world\n\n';
    const block = '```mermaid\nflowchart LR\n  Start --> End\n```';
    const md = prefix + block + '\n\nTrailing text';

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe(prefix.length);
    expect(blocks[0].end).toBe(prefix.length + block.length);
  });

  it('handles block with complex multiline content', () => {
    const source = `classDiagram
  class Animal {
    +String name
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  Animal <|-- Dog`;

    const md = `\`\`\`mermaid
${source}
\`\`\``;

    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe(source);
  });
});
