import { waitForMermaidDiagrams } from './mermaid-wait';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function downloadHTML(title: string): Promise<void> {
  const container = document.getElementById('markdown-content');
  if (!container) throw new Error('Preview not rendered');

  // Wait for all Mermaid diagrams to finish rendering before capturing
  await waitForMermaidDiagrams(container);

  const safeTitle = escapeHtml(title);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>body { max-width:800px; margin:40px auto; padding:0 20px; font-family: system-ui, sans-serif; }</style>
</head>
<body>
${container.innerHTML}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
