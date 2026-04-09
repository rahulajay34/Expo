import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent } from 'hast';

/**
 * Rehype plugin that wraps each line of code in a <span class="code-line">.
 * Must run AFTER rehype-highlight (which splits tokens across spans).
 * Mermaid code blocks are skipped (they don't go through rehype-highlight).
 */
export function rehypeWrapLines() {
  /**
   * Flatten a HAST node tree into a sequence of line-groups.
   * Handles newlines inside nested highlight spans (e.g. multi-line strings).
   * When a text node inside a <span> contains \n, the span is split into
   * multiple copies — one per line — so each visual line gets its own code-line wrapper.
   */
  function splitIntoLines(children: ElementContent[]): ElementContent[][] {
    let currentLine: ElementContent[] = [];
    const lines: ElementContent[][] = [currentLine];

    for (const child of children) {
      if (child.type === 'text') {
        const parts = child.value.split('\n');
        for (let j = 0; j < parts.length; j++) {
          if (j > 0) {
            currentLine = [];
            lines.push(currentLine);
          }
          if (parts[j]) {
            currentLine.push({ type: 'text', value: parts[j] });
          }
        }
      } else if (child.type === 'element') {
        // Check if any descendant text node contains \n
        const hasNewline = (n: ElementContent): boolean => {
          if (n.type === 'text') return n.value.includes('\n');
          if (n.type === 'element') return n.children.some(hasNewline);
          return false;
        };

        if (!hasNewline(child)) {
          // No newlines — keep the element as-is on the current line
          currentLine.push(child);
        } else {
          // Recursively split the element's children, wrapping each sub-line
          // in a clone of this element to preserve highlight classes.
          const subLines = splitIntoLines(child.children);
          for (let k = 0; k < subLines.length; k++) {
            if (k > 0) {
              currentLine = [];
              lines.push(currentLine);
            }
            if (subLines[k].length > 0) {
              currentLine.push({
                type: 'element',
                tagName: child.tagName,
                properties: { ...child.properties },
                children: subLines[k],
              } as Element);
            }
          }
        }
      }
    }

    return lines;
  }

  return function (tree: Root) {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || node.tagName !== 'code') return;
      // Only wrap code blocks inside <pre> — skip inline code (e.g. `foo`)
      // so that inline code doesn't become block-level and break a line.
      if ((parent as Element).tagName !== 'pre') return;
      // Skip mermaid blocks
      const classes: string[] = (node.properties?.className as string[]) ?? [];
      if (classes.includes('language-mermaid')) return;

      const lines = splitIntoLines(node.children);

      // Wrap each non-empty line in a code-line span
      const wrapped: ElementContent[] = [];
      for (const line of lines) {
        wrapped.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['code-line'] },
          children: line.length > 0 ? line : [{ type: 'text', value: '' }],
        } as Element);
      }

      node.children = wrapped;
    });
  };
}
