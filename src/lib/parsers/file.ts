import { SourceFile } from '../types';

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function getFileType(file: File): SourceFile['type'] {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (['txt', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html'].includes(ext)) return 'code';
  return 'txt';
}

export async function parseFile(file: File): Promise<SourceFile> {
  const type = getFileType(file);

  if (type === 'pdf') {
    const { extractPDFText } = await import('./pdf');
    const content = await extractPDFText(file);
    return { type, name: file.name, content };
  }

  if (type === 'pptx') {
    const { extractPPTXText } = await import('./pptx');
    const content = await extractPPTXText(file);
    return { type, name: file.name, content };
  }

  // Markdown, code, text — read directly
  const content = await readFileAsText(file);
  return { type, name: file.name, content };
}
