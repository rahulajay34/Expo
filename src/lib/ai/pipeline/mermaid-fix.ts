/**
 * Mermaid diagram fix message builder for the generation pipeline.
 *
 * Constructs a targeted refiner-style prompt that instructs the model to return
 * ONLY corrected ```mermaid blocks as `### Section Name` patches. Reuses the
 * existing section-patch protocol so `mergeSectionPatches` can merge the
 * fixes alongside any other refiner output.
 */

import { Message } from '../client';
import { MermaidFailure } from '../../validation/mermaid';

export function buildMermaidFixMessages(originalContent: string, failures: MermaidFailure[]): Message[] {
  const failureList = failures
    .map(
      (f, i) =>
        `Broken block #${i + 1}${f.error ? ` — parser error: ${f.error}` : ''}\n\`\`\`mermaid\n${f.source}\n\`\`\``,
    )
    .join('\n\n');

  const system = `You are fixing broken Mermaid diagrams inside an educational markdown document. The Mermaid parser has rejected one or more \`\`\`mermaid blocks in the document.

Your task: fix ONLY the broken mermaid blocks. Do not change anything else about the document.

OUTPUT FORMAT — follow exactly:
- Output each changed section using its \`### Section Name\` header, echoed VERBATIM from the original document (same exact text, numbering, punctuation).
- Under each \`### Section Name\` header, output the FULL replacement body for that section, including the corrected \`\`\`mermaid\` block(s).
- Do NOT include unchanged sections — they will be preserved automatically.
- Do NOT add any preamble, explanation, or closing commentary outside the section blocks.
- Do NOT wrap your output in code fences.
- Keep prose, lists, and other non-diagram content inside the section identical to the original. Only the mermaid block(s) should change.

Rules for the fixed mermaid:
- Must parse cleanly (valid graph type declaration, balanced brackets/quotes, well-formed edge syntax).
- Preserve the original intent of the diagram — do not replace it with a different diagram type unless the original type is unrecoverable.
- Keep node labels and structure as close to the original as possible.`;

  const user = `The following mermaid blocks failed to parse and need to be fixed:

${failureList}

Return ONLY the changed \`### Section Name\` blocks containing the corrected mermaid. Do not change anything else.

ORIGINAL CONTENT:
${originalContent}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
