import { defaultSchema } from 'rehype-sanitize';

/**
 * Custom sanitization schema extending GitHub's defaults.
 * Allows safe HTML elements (details, tables, KaTeX spans, etc.)
 * while stripping dangerous ones (script, iframe, form, etc.).
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details', 'summary',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'br', 'hr',
    'code', 'pre', 'blockquote',
    'sup', 'sub', 'mark',
    // SVG elements
    'svg', 'path',
    // MathML elements (KaTeX / remark-math)
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn',
    'msup', 'msub', 'mfrac', 'mtext',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // Allow class/className and data-* on all elements (syntax highlighting hljs-* + KaTeX katex* classes)
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'class', 'data*'],
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className', 'class'],
    // KaTeX uses inline styles on span/div
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'className', 'class', 'style'],
    div: [...(defaultSchema.attributes?.['div'] ?? []), 'className', 'class', 'style'],
    td: [...(defaultSchema.attributes?.['td'] ?? []), 'align', 'valign'],
    th: [...(defaultSchema.attributes?.['th'] ?? []), 'align', 'valign'],
  },
  strip: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
};
