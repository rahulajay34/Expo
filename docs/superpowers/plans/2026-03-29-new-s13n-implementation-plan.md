# New-S13n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete content authoring web app for educators to generate lecture notes, pre-lecture notes, and assignments via a multi-agent AI pipeline.

**Architecture:** Next.js 14 App Router with TypeScript, Tailwind CSS, and browser-only processing. AI calls via serverless API routes with SSE streaming. localStorage for persistence. Four independent build tracks can run in parallel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, react-markdown, remark-mermaid, remark-math, rehype-highlight, pdfjs-dist, jszip, html2pdf.js, OpenAI/MiniMax/Gemini/xAI SDKs

---

## File Structure

```
/MYAPP
├── Prompts/                          # Existing prompt templates
├── template.csv                      # Existing LMS CSV template
├── docs/superpowers/
│   ├── specs/2026-03-29-new-s13n-design.md
│   └── plans/2026-03-29-new-s13n-implementation-plan.md
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with sidebar
│   │   ├── page.tsx                 # Generation page (/)
│   │   ├── content/
│   │   │   ├── page.tsx             # Content library
│   │   │   └── [id]/page.tsx       # Content viewer/editor
│   │   └── settings/page.tsx         # API keys & preferences
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── FileUpload.tsx
│   │   ├── GenerationForm.tsx
│   │   ├── ContentCard.tsx
│   │   ├── ExportMenu.tsx
│   │   └── ui/                     # Shared UI primitives
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       └── Badge.tsx
│   └── lib/
│       ├── types.ts                 # All TypeScript interfaces
│       ├── storage.ts               # localStorage CRUD + size
│       ├── ai/
│       │   ├── client.ts            # Unified AI client
│       │   ├── pipeline.ts          # Pipeline orchestration
│       │   └── prompts.ts           # Prompt loader
│       ├── parsers/
│       │   ├── pdf.ts
│       │   ├── pptx.ts
│       │   └── file.ts              # Generic file reader
│       └── export/
│           ├── markdown.ts
│           ├── pdf.ts
│           └── csv.ts
├── public/
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── .env.local.example
```

---

## Track 1: Project Scaffolding

**Owner:** scaffold-agent
**Prerequisites:** None

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.local.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "new-s13n",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "remark-mermaid": "^0.2.0",
    "remark-math": "^6.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-raw": "^7.0.0",
    "pdfjs-dist": "^4.0.379",
    "jszip": "^3.10.1",
    "html2pdf.js": "^0.10.1",
    "openai": "^4.28.0",
    "@google/generative-ai": "^0.2.1",
    "uuid": "^9.0.0",
    "tailwind-merge": "^2.2.1",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/uuid": "^9.0.7",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      pdftk: false,
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        sidebar: '#F7F6F3',
        border: '#E8E8E8',
        'text-primary': '#37352F',
        'text-secondary': '#787774',
        accent: '#2383E2',
        success: '#3DAF4B',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xl': ['24px', { lineHeight: '1.3' }],
        xl: ['20px', { lineHeight: '1.35' }],
        lg: ['16px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.6' }],
        xs: ['12px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create .env.local.example**

```
OPENAI_API_KEY=
MINIMAX_API_KEY=
GEMINI_API_KEY=
XAI_API_KEY=
```

- [ ] **Step 7: Create src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --background: #FFFFFF;
  --sidebar: #F7F6F3;
  --border: #E8E8E8;
  --text-primary: #37352F;
  --text-secondary: #787774;
  --accent: #2383E2;
  --success: #3DAF4B;
  --warning: #D97706;
  --danger: #DC2626;
}

@layer base {
  body {
    @apply bg-background text-text-primary font-sans antialiased;
  }
}

/* Print stylesheet for PDF export */
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .markdown-body { font-size: 12pt; line-height: 1.6; }
  .markdown-body h1 { font-size: 18pt; page-break-after: avoid; }
  .markdown-body h2 { font-size: 14pt; page-break-after: avoid; }
  .markdown-body pre { page-break-inside: avoid; }
  .markdown-body table { page-break-inside: avoid; }
}
```

- [ ] **Step 8: Create src/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'New-S13n',
  description: 'Educational content authoring tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git init && git add package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.js .env.local.example src/app/globals.css src/app/layout.tsx
git commit -m "feat: scaffold Next.js project with Tailwind and TypeScript"
```

---

### Task 1.2: Create TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types file**

```ts
// Content types
export type ContentType = 'lecture' | 'pre-lecture' | 'assignment';

export interface SourceFile {
  type: string;  // 'pdf' | 'pptx' | 'md' | 'txt' | 'code'
  name: string;
  content?: string;  // extracted text
}

export interface ContentMetadata {
  topic?: string;
  subtopics?: string[];
  prerequisites?: string[];
  questionCounts?: { mcq: number; msq: number; subjective: number };
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  provider: AIProvider;
  sources: SourceFile[];
  metadata: ContentMetadata;
}

// AI types
export type AIProvider = 'openai' | 'minimax' | 'gemini' | 'xai';

export interface GenerationInput {
  type: ContentType;
  topic: string;
  sources: SourceFile[];
  transcript?: string;
  subtopics?: string[];
  prerequisites?: string[];
  questionCounts?: { mcq: number; msq: number; subjective: number };
  provider: AIProvider;
}

export interface PipelineStage {
  name: 'creator' | 'reviewer' | 'refiner' | 'formatter' | 'csv-converter';
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

export interface StreamingState {
  content: string;
  stages: PipelineStage[];
  isComplete: boolean;
  error?: string;
}

// CSV types
export interface CSVRow {
  questionType: string;
  contentType: string;
  contentBody: string;
  intAnswer: string;
  'prepTime(in_seconds)': string;
  'floatAnswer.max': string;
  'floatAnswer.min': string;
  fitbAnswer: string;
  mcscAnswer: string;
  subjectiveAnswer: string;
  'option.1': string;
  'option.2': string;
  'option.3': string;
  'option.4': string;
  mcmcAnswer: string;
  tagRelationships: string;
  difficultyLevel: string;
  answerExplanationType: string;
  answerExplanation: string;
}

// UI types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface StorageStats {
  usedBytes: number;
  maxBytes: number;  // 5MB browser limit
  itemCount: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 1.3: Create Shared UI Primitives

**Files:**
- Create: `src/lib/utils.ts` (cn helper)
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Select.tsx`
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Create src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create Button.tsx**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            primary: 'bg-accent text-white hover:bg-accent/90',
            secondary: 'bg-white text-text-primary border border-border hover:bg-sidebar',
            ghost: 'text-text-secondary hover:bg-sidebar hover:text-text-primary',
            danger: 'bg-danger text-white hover:bg-danger/90',
          }[variant],
          {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button };
```

- [ ] **Step 3: Create Card.tsx**

```tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('bg-white rounded-md border border-border', className)} {...props} />
  )
);
Card.displayName = 'Card';
export { Card };
```

- [ ] **Step 4: Create Modal.tsx**

```tsx
import { useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">&times;</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Input.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-border rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
        'placeholder:text-text-secondary',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
export { Input };
```

- [ ] **Step 6: Create Select.tsx**

```tsx
import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-border rounded-md bg-white',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';
export { Select };
```

- [ ] **Step 7: Create Badge.tsx**

```tsx
import { cn } from '@/lib/utils';

type BadgeVariant = 'lecture' | 'pre-lecture' | 'assignment' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        {
          lecture: 'bg-blue-100 text-blue-700',
          'pre-lecture': 'bg-green-100 text-green-700',
          assignment: 'bg-purple-100 text-purple-700',
          default: 'bg-sidebar text-text-secondary',
        }[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/utils.ts src/components/ui/
git commit -m "feat: add shared UI primitives (Button, Card, Modal, Input, Select, Badge, cn)"
```

---

## Track 2: Storage & Export

**Owner:** storage-agent
**Prerequisites:** Task 1.2 (types.ts)

### Task 2.1: localStorage System

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Write storage.ts**

```ts
import { ContentItem, StorageStats } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'news13n_content';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB browser limit
const WARN_THRESHOLD = 0.8; // warn at 80%

function getStorage(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStorage(items: ContentItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getStorageStats(): StorageStats {
  const items = getStorage();
  const usedBytes = new Blob([JSON.stringify(items)]).size;
  return {
    usedBytes,
    maxBytes: MAX_BYTES,
    itemCount: items.length,
  };
}

export function shouldWarnStorage(): boolean {
  const { usedBytes } = getStorageStats();
  return usedBytes / MAX_BYTES >= WARN_THRESHOLD;
}

export function getAllContent(): ContentItem[] {
  return getStorage();
}

export function getContentById(id: string): ContentItem | undefined {
  return getStorage().find((item) => item.id === id);
}

export function saveContent(item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): ContentItem {
  const items = getStorage();
  const now = new Date().toISOString();
  const newItem: ContentItem = {
    ...item,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(newItem); // newest first
  setStorage(items);
  return newItem;
}

export function updateContent(id: string, updates: Partial<ContentItem>): ContentItem | null {
  const items = getStorage();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  setStorage(items);
  return items[index];
}

export function deleteContent(id: string): boolean {
  const items = getStorage();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  setStorage(filtered);
  return true;
}

export function deleteMultipleContent(ids: string[]): number {
  const items = getStorage();
  const idSet = new Set(ids);
  const filtered = items.filter((item) => !idSet.has(item.id));
  setStorage(filtered);
  return items.length - filtered.length;
}

export function clearAllContent(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function searchContent(query: string): ContentItem[] {
  const lower = query.toLowerCase();
  return getStorage().filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.markdown.toLowerCase().includes(lower) ||
      item.metadata.topic?.toLowerCase().includes(lower)
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add localStorage CRUD with size monitoring"
```

---

### Task 2.2: Export System

**Files:**
- Create: `src/lib/export/markdown.ts`
- Create: `src/lib/export/pdf.ts`
- Create: `src/lib/export/csv.ts`

- [ ] **Step 1: Create src/lib/export/markdown.ts**

```ts
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create src/lib/export/pdf.ts**

```ts
// Dynamic import to avoid SSR issues
export async function downloadPDF(elementId: string, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt).from(element).save();
}
```

- [ ] **Step 3: Create src/lib/export/csv.ts**

```ts
import { CSVRow } from './types';

const CSV_HEADERS = [
  'questionType', 'contentType', 'contentBody', 'intAnswer', 'prepTime(in_seconds)',
  'floatAnswer.max', 'floatAnswer.min', 'fitbAnswer', 'mcscAnswer', 'subjectiveAnswer',
  'option.1', 'option.2', 'option.3', 'option.4', 'mcmcAnswer', 'tagRelationships',
  'difficultyLevel', 'answerExplanationType', 'answerExplanation',
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseMCQ(text: string): Partial<CSVRow> | null {
  // Format: **Question N (MCQ)** ... A) ... B) ... C) ... D) ... **Correct Answer:** X ... **Difficulty:** N ... **Explanation:** ...
  const qMatch = text.match(/\*\*Question (\d+) \(MCQ\)\*\*/);
  if (!qMatch) return null;

  const lines = text.split('\n').map(l => l.trim());
  const result: Partial<CSVRow> = {
    questionType: 'mcsc',
    contentType: 'text',
    mcscAnswer: '',
    difficultyLevel: '0',
    answerExplanationType: 'text',
    answerExplanation: '',
    'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  };

  // Extract question body (everything between header and option A)
  let bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (/\*\*Question \d+ \(MCQ\)\*\*/.test(line)) { inBody = true; continue; }
    if (inBody && line.startsWith('A)')') { break; }
    if (inBody) bodyLines.push(line);
  }
  result.contentBody = bodyLines.join(' ').trim();

  // Extract options
  for (const line of lines) {
    const aMatch = line.match(/^A\)\s*(.+)/);
    const bMatch = line.match(/^B\)\s*(.+)/);
    const cMatch = line.match(/^C\)\s*(.+)/);
    const dMatch = line.match(/^D\)\s*(.+)/);
    if (aMatch) result['option.1'] = aMatch[1].trim();
    if (bMatch) result['option.2'] = bMatch[1].trim();
    if (cMatch) result['option.3'] = cMatch[1].trim();
    if (dMatch) result['option.4'] = dMatch[1].trim();
  }

  // Extract correct answer
  const correctMatch = text.match(/\*\*Correct Answer:\*\*\s*([A-D])/i);
  if (correctMatch) {
    const letter = correctMatch[1].toUpperCase();
    result.mcscAnswer = letter.charCodeAt(0) - 64; // A=1, B=2, etc.
  }

  // Extract difficulty
  const diffMatch = text.match(/\*\*Difficulty:\*\*\s*(\d+)/);
  if (diffMatch) result.difficultyLevel = diffMatch[1];

  // Extract explanation
  const expMatch = text.match(/\*\*Explanation:\*\*\s*([\s\S]+?)(?=\n\*\*|\n##|$)/);
  if (expMatch) {
    result.answerExplanation = expMatch[1].trim();
    if (expMatch[1].includes('**') || expMatch[1].includes('`')) {
      result.answerExplanationType = 'markdown';
    }
  }

  return result;
}

function parseMSQ(text: string): Partial<CSVRow> | null {
  const qMatch = text.match(/\*\*Question (\d+) \(MSQ\)\*\*/);
  if (!qMatch) return null;

  const lines = text.split('\n').map(l => l.trim());
  const result: Partial<CSVRow> = {
    questionType: 'mcmc',
    contentType: 'text',
    mcmcAnswer: '',
    difficultyLevel: '0',
    answerExplanationType: 'text',
    answerExplanation: '',
    'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  };

  let bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (/\*\*Question \d+ \(MSQ\)\*\*/.test(line)) { inBody = true; continue; }
    if (inBody && line.startsWith('A)')') { break; }
    if (inBody) bodyLines.push(line);
  }
  result.contentBody = bodyLines.join(' ').trim();

  for (const line of lines) {
    const aMatch = line.match(/^A\)\s*(.+)/);
    const bMatch = line.match(/^B\)\s*(.+)/);
    const cMatch = line.match(/^C\)\s*(.+)/);
    const dMatch = line.match(/^D\)\s*(.+)/);
    if (aMatch) result['option.1'] = aMatch[1].trim();
    if (bMatch) result['option.2'] = bMatch[1].trim();
    if (cMatch) result['option.3'] = cMatch[1].trim();
    if (dMatch) result['option.4'] = dMatch[1].trim();
  }

  // Extract correct answers (e.g., "A, C" or "A, B, D")
  const correctMatch = text.match(/\*\*Correct Answers:\*\*\s*([A-C,\s]+)/i);
  if (correctMatch) {
    const letters = correctMatch[1].toUpperCase().split(/[,\s]+/).filter(Boolean);
    result.mcmcAnswer = letters.map(l => l.charCodeAt(0) - 64).join(', ');
  }

  const diffMatch = text.match(/\*\*Difficulty:\*\*\s*(\d+)/);
  if (diffMatch) result.difficultyLevel = diffMatch[1];

  const expMatch = text.match(/\*\*Explanation:\*\*\s*([\s\S]+?)(?=\n\*\*|\n##|$)/);
  if (expMatch) result.answerExplanation = expMatch[1].trim();

  return result;
}

function parseSubjective(text: string): Partial<CSVRow> | null {
  const qMatch = text.match(/\*\*Question (\d+) \(Subjective\)\*\*/);
  if (!qMatch) return null;

  const lines = text.split('\n').map(l => l.trim());
  const result: Partial<CSVRow> = {
    questionType: 'subjective',
    contentType: 'text',
    difficultyLevel: '0',
    answerExplanationType: 'text',
    answerExplanation: '',
  };

  let bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (/\*\*Question \d+ \(Subjective\)\*\*/.test(line)) { inBody = true; continue; }
    if (inBody && line.startsWith('**Deliverables:**')) { break; }
    if (inBody && line.startsWith('**')) { break; }
    if (inBody) bodyLines.push(line);
  }
  result.contentBody = bodyLines.join(' ').trim();

  // Extract Model Answer
  const modelMatch = text.match(/\*\*Model Answer:\*\*\s*([\s\S]+?)$/);
  if (modelMatch) result.answerExplanation = modelMatch[1].trim();

  return result;
}

export function parseAssignmentMarkdown(markdown: string): CSVRow[] {
  const questions = markdown.split(/(?=\*\*Question \d+)/).filter(Boolean);
  const rows: CSVRow[] = [];

  const emptyRow: CSVRow = {
    questionType: '', contentType: 'text', contentBody: '', intAnswer: '',
    'prepTime(in_seconds)': '', 'floatAnswer.max': '', 'floatAnswer.min': '', fitbAnswer: '',
    mcscAnswer: '', subjectiveAnswer: '', 'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
    mcmcAnswer: '', tagRelationships: '', difficultyLevel: '', answerExplanationType: 'text', answerExplanation: '',
  };

  for (const q of questions) {
    let row: Partial<CSVRow> | null = null;

    if (q.includes('(MCQ)')) row = parseMCQ(q);
    else if (q.includes('(MSQ)')) row = parseMSQ(q);
    else if (q.includes('(Subjective)')) row = parseSubjective(q);

    if (row) {
      rows.push({ ...emptyRow, ...row } as CSVRow);
    }
  }

  return rows;
}

export function convertToCSV(rows: CSVRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const values = CSV_HEADERS.map(h => escapeCSV(String(row[h as keyof CSVRow] ?? '')));
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export function downloadCSV(rows: CSVRow[], filename: string): void {
  const csv = convertToCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/export/
git commit -m "feat: add export system (markdown, PDF, CSV)"
```

---

## Track 3: File Parsers

**Owner:** parser-agent
**Prerequisites:** Task 1.2 (types.ts)

### Task 3.1: File Parsers

**Files:**
- Create: `src/lib/parsers/file.ts`
- Create: `src/lib/parsers/pdf.ts`
- Create: `src/lib/parsers/pptx.ts`

- [ ] **Step 1: Create src/lib/parsers/file.ts**

```ts
import { SourceFile } from './types';

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
```

- [ ] **Step 2: Create src/lib/parsers/pdf.ts**

```ts
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n--- Page Break ---\n\n');
}
```

- [ ] **Step 3: Create src/lib/parsers/pptx.ts**

```ts
import JSZip from 'jszip';

export async function extractPPTXText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideTexts: string[] = [];
  const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/;

  const slideFiles = Object.keys(zip.files)
    .filter(name => slideRegex.test(name))
    .sort((a, b) => {
      const numA = parseInt(slideRegex.exec(a)![1]);
      const numB = parseInt(slideRegex.exec(b)![1]);
      return numA - numB;
    });

  for (const slidePath of slideFiles) {
    const xmlContent = await zip.file(slidePath)?.async('string');
    if (!xmlContent) continue;

    // Extract all text from the slide XML
    const textMatches = xmlContent.match(/<a:t>([^<]+)<\/a:t>/g) || [];
    const slideText = textMatches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
    slideTexts.push(slideText);
  }

  return slideTexts.join('\n\n--- Slide Break ---\n\n');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/parsers/
git commit -m "feat: add file parsers (PDF, PPTX, text/code)"
```

---

## Track 4: AI System

**Owner:** ai-agent
**Prerequisites:** Task 1.2 (types.ts)

### Task 4.1: Unified AI Client

**Files:**
- Create: `src/lib/ai/client.ts`

- [ ] **Step 1: Write client.ts**

```ts
import { AIProvider, GenerationInput } from '../types';
import OpenAI from 'openai';

interface AIConfig {
  apiKey: string;
  baseURL?: string; // for MiniMax/custom endpoints
}

function getConfig(provider: AIProvider): AIConfig {
  if (typeof window === 'undefined') return { apiKey: '' };
  const stored = localStorage.getItem(`news13n_apikey_${provider}`);
  const envKey = {
    openai: process.env.OPENAI_API_KEY,
    minimax: process.env.MINIMAX_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    xai: process.env.XAI_API_KEY,
  }[provider];
  return { apiKey: stored ?? envKey ?? '' };
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export async function createStreamingCompletion(
  provider: AIProvider,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const config = getConfig(provider);

  if (provider === 'openai') {
    return streamOpenAI(config.apiKey, messages, onChunk);
  }

  if (provider === 'minimax') {
    return streamMinimax(config.apiKey, messages, onChunk);
  }

  if (provider === 'gemini') {
    return streamGemini(config.apiKey, messages, onChunk);
  }

  if (provider === 'xai') {
    return streamXAI(config.apiKey, messages, onChunk);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function streamOpenAI(
  apiKey: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      full += delta;
      onChunk({ delta, done: false });
    }
  }
  onChunk({ delta: '', done: true });
  return full;
}

async function streamMinimax(
  apiKey: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  // MiniMax uses OpenAI-compatible API with custom endpoint
  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(`MiniMax API error: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // SSE format: data: {...}\n\n
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') { onChunk({ delta: '', done: true }); continue; }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) { full += delta; onChunk({ delta, done: false }); }
      } catch { /* skip */ }
    }
  }

  onChunk({ delta: '', done: true });
  return full;
}

async function streamGemini(
  apiKey: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : m.content?.toString() ?? '' }],
  }));

  const result = await model.generateContentStream({ contents });
  let full = '';
  for await (const chunk of result.stream) {
    const delta = chunk.text();
    full += delta;
    onChunk({ delta, done: false });
  }
  onChunk({ delta: '', done: true });
  return full;
}

async function streamXAI(
  apiKey: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(`xAI API error: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') { onChunk({ delta: '', done: true }); continue; }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) { full += delta; onChunk({ delta, done: false }); }
      } catch { /* skip */ }
    }
  }

  onChunk({ delta: '', done: true });
  return full;
}

export function validateAPIKey(provider: AIProvider, key: string): Promise<boolean> {
  return createStreamingCompletion(
    provider,
    [{ role: 'user', content: 'Hi' }],
    { delta: () => {}, done: true } as any
  ).then(() => true).catch(() => false);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/client.ts
git commit -m "feat: add unified AI client with OpenAI/MiniMax/Gemini/xAI streaming"
```

---

### Task 4.2: Prompt Loader & Pipeline

**Files:**
- Create: `src/lib/ai/prompts.ts`
- Create: `src/lib/ai/pipeline.ts`

- [ ] **Step 1: Create prompts.ts**

```ts
import { GenerationInput } from '../types';

export async function loadPrompt(filename: string): Promise<string> {
  const res = await fetch(`/Prompts/${filename}`);
  if (!res.ok) throw new Error(`Failed to load prompt: ${filename}`);
  return res.text();
}

export function fillPrompt(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return filled;
}

export function buildCreatorMessages(input: GenerationInput, promptTemplate: string): { role: 'user' | 'system'; content: string }[] {
  const variables: Record<string, string> = {
    TOPIC: input.topic,
    TRANSCRIPT: input.sources.map(s => s.content ?? '').join('\n\n'),
    SUBTOPICS: input.subtopics?.join(', ') ?? '',
    PREREQUISITES: input.prerequisites?.join(', ') ?? '',
    ...(input.questionCounts ? {
      MCQ_COUNT: String(input.questionCounts.mcq),
      MSQ_COUNT: String(input.questionCounts.msq),
      SUBJECTIVE_COUNT: String(input.questionCounts.subjective),
    } : {}),
  };

  const content = fillPrompt(promptTemplate, variables);

  return [
    { role: 'system', content: 'You are an expert educational content creator.' },
    { role: 'user', content },
  ];
}

export function buildReviewerMessages(originalContent: string): { role: 'user' | 'system'; content: string }[] {
  return [
    { role: 'system', content: 'You are an expert educational content reviewer. Check for factual errors, structural issues, formatting problems, and quality issues. If everything looks good, say "LGTM". Otherwise, list specific issues that need fixing.' },
    { role: 'user', content: `Review this content and identify any issues:\n\n${originalContent}` },
  ];
}

export function buildRefinerMessages(originalContent: string, issues: string): { role: 'user' | 'system'; content: string }[] {
  return [
    { role: 'system', content: 'You are an expert educational content refiner. Fix the issues identified by the reviewer while preserving the content quality.' },
    { role: 'user', content: `Fix these issues in the content:\n\nIssues:\n${issues}\n\nOriginal content:\n${originalContent}` },
  ];
}

export function buildFormatterMessages(content: string, contentType: string): { role: 'user' | 'system'; content: string }[] {
  return [
    { role: 'system', content: `You are an expert formatter. Ensure the ${contentType} content is properly structured with consistent markdown formatting.` },
    { role: 'user', content: `Format this ${contentType} content with proper markdown structure:\n\n${content}` },
  ];
}
```

- [ ] **Step 2: Create pipeline.ts**

```ts
import { GenerationInput, StreamingState, PipelineStage } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, buildFormatterMessages } from './prompts';
import { createStreamingCompletion, StreamChunk } from './client';

const PROMPT_FILES: Record<string, string> = {
  lecture: 'lecture notes prompt.md',
  'pre-lecture': 'pre-lecture notes prompt.md',
  assignment: 'assignment prompt.md',
};

export async function runPipeline(
  input: GenerationInput,
  onChunk: (state: StreamingState) => void
): Promise<string> {
  const stages: PipelineStage[] = [
    { name: 'creator', status: 'pending' },
    { name: 'reviewer', status: 'pending' },
    { name: 'refiner', status: 'pending' },
    { name: 'formatter', status: 'pending' },
    { name: 'csv-converter', status: 'pending' },
  ];

  function updateStage(name: PipelineStage['name'], updates: Partial<PipelineStage>) {
    const idx = stages.findIndex(s => s.name === name);
    if (idx !== -1) stages[idx] = { ...stages[idx], ...updates };
  }

  function emit(content: string, isComplete = false) {
    onChunk({ content, stages: [...stages], isComplete });
  }

  // Stage 1: Creator
  updateStage('creator', { status: 'running' });
  emit('');

  const promptTemplate = await loadPrompt(PROMPT_FILES[input.type]);
  const creatorMessages = buildCreatorMessages(input, promptTemplate);
  let creatorOutput = '';

  try {
    creatorOutput = await createStreamingCompletion(input.provider, creatorMessages, (chunk: StreamChunk) => {
      creatorOutput += chunk.delta;
      emit(creatorOutput, chunk.done);
    });
  } catch (err) {
    updateStage('creator', { status: 'error', error: (err as Error).message });
    emit(creatorOutput, false);
    throw err;
  }

  updateStage('creator', { status: 'done' });
  emit(creatorOutput);

  // Stage 2: Reviewer
  updateStage('reviewer', { status: 'running' });
  const reviewerMessages = buildReviewerMessages(creatorOutput);
  let reviewerOutput = '';
  let issuesFound = '';

  try {
    reviewerOutput = await createStreamingCompletion(input.provider, reviewerMessages, (chunk: StreamChunk) => {
      reviewerOutput += chunk.delta;
    });
    issuesFound = reviewerOutput.trim();
  } catch {
    updateStage('reviewer', { status: 'error', error: 'Reviewer failed — continuing without review' });
    emit(creatorOutput);
    return creatorOutput;
  }

  updateStage('reviewer', { status: 'done' });

  // Stage 3: Refiner (only if issues found)
  let refinedOutput = creatorOutput;

  if (issuesFound && !issuesFound.toUpperCase().includes('LGTM')) {
    updateStage('refiner', { status: 'running' });
    const refinerMessages = buildRefinerMessages(creatorOutput, issuesFound);

    try {
      refinedOutput = await createStreamingCompletion(input.provider, refinerMessages, (chunk: StreamChunk) => {
        refinedOutput += chunk.delta;
        emit(refinedOutput);
      });
    } catch {
      updateStage('refiner', { status: 'error', error: 'Refiner failed — using creator output' });
      refinedOutput = creatorOutput;
    }
    updateStage('refiner', { status: 'done' });
  } else {
    updateStage('refiner', { status: 'done' });
  }

  emit(refinedOutput);

  // Stage 4: Formatter
  updateStage('formatter', { status: 'running' });
  const formatterMessages = buildFormatterMessages(refinedOutput, input.type);
  let formattedOutput = refinedOutput;

  try {
    formattedOutput = await createStreamingCompletion(input.provider, formatterMessages, (chunk: StreamChunk) => {
      formattedOutput += chunk.delta;
      emit(formattedOutput);
    });
  } catch {
    updateStage('formatter', { status: 'error', error: 'Formatter failed — using previous output' });
    formattedOutput = refinedOutput;
  }

  updateStage('formatter', { status: 'done' });
  emit(formattedOutput, true);

  return formattedOutput;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts.ts src/lib/ai/pipeline.ts
git commit -m "feat: add AI pipeline with streaming and error handling"
```

---

## Track 5: Components

**Owner:** components-agent
**Prerequisites:** Tasks 1.1, 1.2, 1.3

### Task 5.1: Sidebar Component

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Write Sidebar.tsx**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Generate', icon: '✦' },
  { href: '/content', label: 'Content', icon: '☰' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-border flex flex-col transition-all duration-200',
        collapsed ? 'w-12' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border">
        <span className="text-lg font-bold text-accent">N</span>
        {!collapsed && <span className="ml-2 font-semibold text-text-primary">New-S13n</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center h-10 px-4 mx-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-border hover:text-text-primary',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              <span className="text-base">{icon}</span>
              {!collapsed && <span className="ml-3">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-border text-text-secondary hover:text-text-primary"
      >
        <span className={cn('text-sm transition-transform', collapsed && 'rotate-180')}>‹</span>
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar component"
```

---

### Task 5.2: Markdown Preview & Editor

**Files:**
- Create: `src/components/MarkdownPreview.tsx`
- Create: `src/components/MarkdownEditor.tsx`

- [ ] **Step 1: Write MarkdownPreview.tsx**

```tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkMermaid from 'remark-mermaid';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn('markdown-body prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMermaid as any, remarkMath, [rehypeHighlight, { ignoreMissing: true }]]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom code block rendering
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match?.[1] === 'mermaid';
            if (isMermaid) {
              return <pre className="mermaid">{children}</pre>;
            }
            return <code className={cn('text-sm font-mono bg-sidebar px-1 rounded', className)} {...props}>{children}</code>;
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-border text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-border bg-sidebar px-3 py-2 text-left font-medium">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-border px-3 py-2">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Write MarkdownEditor.tsx**

```tsx
'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TOOLBAR_ACTIONS = [
  { label: 'B', action: 'bold', prefix: '**', suffix: '**' },
  { label: 'I', action: 'italic', prefix: '_', suffix: '_' },
  { label: 'H', action: 'heading', prefix: '## ', suffix: '' },
  { label: 'Code', action: 'code', prefix: '`', suffix: '`' },
  { label: 'Block', action: 'codeblock', prefix: '```\n', suffix: '\n```' },
  { label: 'List', action: 'list', prefix: '- ', suffix: '' },
  { label: 'Link', action: 'link', prefix: '[', suffix: '](url)' },
];

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [value, onChange]);

  return (
    <div className={cn('flex flex-col border border-border rounded-md', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-sidebar">
        {TOOLBAR_ACTIONS.map(({ label, action, prefix, suffix }) => (
          <button
            key={action}
            type="button"
            onClick={() => applyFormat(prefix, suffix)}
            className="px-2 py-1 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-border rounded"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-4 text-sm font-mono resize-none focus:outline-none bg-white rounded-b-md"
        placeholder="Start writing..."
        spellCheck={false}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/MarkdownPreview.tsx src/components/MarkdownEditor.tsx
git commit -m "feat: add MarkdownPreview and MarkdownEditor components"
```

---

### Task 5.3: FileUpload Component

**Files:**
- Create: `src/components/FileUpload.tsx`

- [ ] **Step 1: Write FileUpload.tsx**

```tsx
'use client';

import { useCallback, useState } from 'react';
import { parseFile } from '@/lib/parsers/file';
import { SourceFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

interface FileUploadProps {
  onFilesLoaded: (files: SourceFile[]) => void;
  maxFiles?: number;
}

export function FileUpload({ onFilesLoaded, maxFiles = 5 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (fileList: FileList) => {
    setLoading(true);
    const newFiles = Array.from(fileList).slice(0, maxFiles);
    const sourceFiles: SourceFile[] = [];

    for (const file of newFiles) {
      try {
        const parsed = await parseFile(file);
        sourceFiles.push(parsed);
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
      }
    }

    setFiles(newFiles);
    onFilesLoaded(sourceFiles);
    setLoading(false);
  }, [maxFiles, onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  }, [processFiles]);

  const clearFiles = () => {
    setFiles([]);
    onFilesLoaded([]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragOver ? 'border-accent bg-accent/5' : 'border-border'
        )}
      >
        <p className="text-sm text-text-secondary mb-3">
          Drop PDF, PPTX, Markdown, or text files here
        </p>
        <label>
          <input
            type="file"
            multiple
            accept=".pdf,.pptx,.md,.markdown,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button type="button" variant="secondary" size="sm" as="span">
            {loading ? 'Processing...' : 'Browse Files'}
          </Button>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{files.length} file(s) loaded</span>
            <button onClick={clearFiles} className="text-xs text-danger hover:underline">Clear</button>
          </div>
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-2 text-sm px-3 py-2 bg-sidebar rounded">
              <span className="text-text-secondary">📄</span>
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-text-secondary text-xs">{(file.size / 1024).toFixed(1)}KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FileUpload.tsx
git commit -m "feat: add FileUpload component with drag-and-drop"
```

---

### Task 5.4: GenerationForm Component

**Files:**
- Create: `src/components/GenerationForm.tsx`

- [ ] **Step 1: Write GenerationForm.tsx**

```tsx
'use client';

import { useState } from 'react';
import { GenerationInput, ContentType, AIProvider, SourceFile } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { FileUpload } from './FileUpload';

interface GenerationFormProps {
  onGenerate: (input: GenerationInput) => void;
  isGenerating: boolean;
}

const DEFAULT_QUESTION_COUNTS = { mcq: 4, msq: 4, subjective: 1 };

export function GenerationForm({ onGenerate, isGenerating }: GenerationFormProps) {
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [topic, setTopic] = useState('');
  const [subtopics, setSubtopics] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [questionCounts, setQuestionCounts] = useState(DEFAULT_QUESTION_COUNTS);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');

  const handleSubmit = () => {
    if (!contentType || !topic) return;

    onGenerate({
      type: contentType,
      topic,
      sources,
      transcript: transcript || undefined,
      subtopics: subtopics ? subtopics.split(',').map(s => s.trim()) : undefined,
      prerequisites: prerequisites ? prerequisites.split(',').map(s => s.trim()) : undefined,
      questionCounts: contentType === 'assignment' ? questionCounts : undefined,
      provider,
    });
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Content Type */}
      <div>
        <label className="block text-sm font-medium mb-3">What do you want to create?</label>
        <div className="grid grid-cols-3 gap-4">
          {([
            { type: 'lecture', label: 'Lecture Notes', desc: 'Full notes from transcript' },
            { type: 'pre-lecture', label: 'Pre-Lecture Notes', desc: 'Introductory pre-read' },
            { type: 'assignment', label: 'Assignment', desc: 'MCQ, MSQ, and subjective' },
          ] as const).map(({ type, label, desc }) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`p-4 rounded-lg border text-left transition-all ${
                contentType === type
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-text-secondary mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Type-specific inputs */}
      {contentType && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-sm font-medium mb-2">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter the topic..."
            />
          </div>

          {contentType === 'pre-lecture' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Subtopics (comma-separated)</label>
                <Input
                  value={subtopics}
                  onChange={(e) => setSubtopics(e.target.value)}
                  placeholder="e.g., Variables, Loops, Functions"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prerequisites (comma-separated)</label>
                <Input
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder="What should students already know?"
                />
              </div>
            </>
          )}

          {(contentType === 'lecture' || contentType === 'assignment') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Input Source</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={inputMode === 'upload'}
                      onChange={() => setInputMode('upload')}
                    />
                    Upload Files
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={inputMode === 'paste'}
                      onChange={() => setInputMode('paste')}
                    />
                    Paste Text
                  </label>
                </div>

                {inputMode === 'upload' ? (
                  <FileUpload onFilesLoaded={setSources} />
                ) : (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste transcript here..."
                    className="w-full h-40 px-3 py-2 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}
              </div>

              {contentType === 'assignment' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">MCQ Count</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={questionCounts.mcq}
                      onChange={(e) => setQuestionCounts(c => ({ ...c, mcq: parseInt(e.target.value) || 4 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">MSQ Count</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={questionCounts.msq}
                      onChange={(e) => setQuestionCounts(c => ({ ...c, msq: parseInt(e.target.value) || 4 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Subjective Count</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={questionCounts.subjective}
                      onChange={(e) => setQuestionCounts(c => ({ ...c, subjective: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: AI Provider */}
      {contentType && (
        <div>
          <label className="block text-sm font-medium mb-2">AI Provider</label>
          <Select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
            <option value="openai">OpenAI</option>
            <option value="minimax">MiniMax</option>
            <option value="gemini">Gemini</option>
            <option value="xai">xAI</option>
          </Select>
        </div>
      )}

      {/* Step 4: Generate */}
      {contentType && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!topic || isGenerating}
            size="lg"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GenerationForm.tsx
git commit -m "feat: add GenerationForm with type-specific inputs"
```

---

### Task 5.5: ContentCard & ExportMenu Components

**Files:**
- Create: `src/components/ContentCard.tsx`
- Create: `src/components/ExportMenu.tsx`

- [ ] **Step 1: Write ContentCard.tsx**

```tsx
'use client';

import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { Badge } from './ui/Badge';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function ContentCard({ item, selected, onSelect }: ContentCardProps) {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className={cn(
        'bg-white border border-border rounded-lg p-4 hover:border-accent/50 transition-colors',
        selected && 'border-accent ring-1 ring-accent'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(item.id)}
              className="rounded"
            />
          )}
          <Link href={`/content/${item.id}`} className="font-medium text-sm hover:text-accent">
            {item.title || 'Untitled'}
          </Link>
        </div>
        <Badge variant={item.type}>{item.type}</Badge>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
        <span>{date}</span>
        <span>•</span>
        <span className="uppercase">{item.provider}</span>
        {item.sources.length > 0 && (
          <>
            <span>•</span>
            <span>{item.sources.length} file(s)</span>
          </>
        )}
      </div>

      {item.metadata.topic && (
        <p className="mt-2 text-xs text-text-secondary truncate">
          Topic: {item.metadata.topic}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write ExportMenu.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ExportMenuProps {
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  showCSV?: boolean;
}

export function ExportMenu({ onExportMarkdown, onExportPDF, onExportCSV, showCSV }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Export ▾
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Export Content">
        <div className="space-y-3">
          <button
            onClick={() => { onExportMarkdown(); setOpen(false); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-sidebar text-left"
          >
            <span className="text-lg">📄</span>
            <div>
              <div className="text-sm font-medium">Markdown (.md)</div>
              <div className="text-xs text-text-secondary">Raw markdown file</div>
            </div>
          </button>

          <button
            onClick={() => { onExportPDF(); setOpen(false); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-sidebar text-left"
          >
            <span className="text-lg">📕</span>
            <div>
              <div className="text-sm font-medium">PDF (.pdf)</div>
              <div className="text-xs text-text-secondary">Print-ready document</div>
            </div>
          </button>

          {showCSV && (
            <button
              onClick={() => { onExportCSV(); setOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-sidebar text-left"
            >
              <span className="text-lg">📊</span>
              <div>
                <div className="text-sm font-medium">CSV (.csv)</div>
                <div className="text-xs text-text-secondary">For LMS import</div>
              </div>
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentCard.tsx src/components/ExportMenu.tsx
git commit -m "feat: add ContentCard and ExportMenu components"
```

---

## Track 6: Pages

**Owner:** pages-agent
**Prerequisites:** Tasks 1.1, 1.3, 2.1, 2.2, 3.1, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5

### Task 6.1: Root Layout with Sidebar

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'New-S13n',
  description: 'Educational content authoring tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add sidebar to root layout"
```

---

### Task 6.2: Generation Page (/)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write src/app/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GenerationInput, ContentItem } from '@/lib/types';
import { runPipeline } from '@/lib/ai/pipeline';
import { saveContent } from '@/lib/storage';
import { GenerationForm } from '@/components/GenerationForm';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function HomePage() {
  const router = useRouter();
  const [preview, setPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInput, setCurrentInput] = useState<GenerationInput | null>(null);
  const [view, setView] = useState<'form' | 'preview'>('form');

  const handleGenerate = async (input: GenerationInput) => {
    setCurrentInput(input);
    setIsGenerating(true);
    setView('preview');
    setPreview('');

    try {
      await runPipeline(input, (state) => {
        setPreview(state.content);
      });

      // Auto-save on completion
      const item = saveContent({
        type: input.type,
        title: input.topic,
        markdown: preview,
        provider: input.provider,
        sources: input.sources,
        metadata: {
          topic: input.topic,
          subtopics: input.subtopics,
          prerequisites: input.prerequisites,
          questionCounts: input.questionCounts,
        },
      });

      // Navigate to the saved content
      setTimeout(() => router.push(`/content/${item.id}`), 500);
    } catch (err) {
      console.error('Generation failed:', err);
      alert(`Generation failed: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">Generate Content</h1>
          <p className="text-sm text-text-secondary mt-0.5">Create educational materials with AI</p>
        </div>
        {view === 'preview' && (
          <div className="flex items-center gap-3">
            <Badge variant={currentInput?.type}>{currentInput?.type}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setView('form')}>
              Back to Form
            </Button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'form' ? (
          <div className="max-w-3xl mx-auto px-8 py-8">
            <GenerationForm onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Streaming indicator */}
            {isGenerating && (
              <div className="px-8 py-2 bg-accent/5 border-b border-border flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-accent">Generating...</span>
              </div>
            )}

            {/* Preview area */}
            <div className="flex-1 overflow-auto px-8 py-6">
              <Card className="h-full overflow-auto">
                <MarkdownPreview content={preview || '*Waiting for content...*'} className="p-6" />
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add generation page with streaming preview"
```

---

### Task 6.3: Content Library (/content)

**Files:**
- Create: `src/app/content/page.tsx`

- [ ] **Step 1: Write src/app/content/page.tsx**

```tsx
'use client';

import { useState, useMemo } from 'react';
import { getAllContent, deleteMultipleContent, searchContent } from '@/lib/storage';
import { ContentItem, ContentType } from '@/lib/types';
import { ContentCard } from '@/components/ContentCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type SortOption = 'newest' | 'oldest' | 'az';

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>(getAllContent());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filtered = useMemo(() => {
    let result = search ? searchContent(search) : items;

    if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    result = [...result].sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [items, search, filterType, sort]);

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDelete = () => {
    deleteMultipleContent(Array.from(selectedIds));
    setItems(getAllContent());
    setSelectedIds(new Set());
    setShowDeleteModal(false);
  };

  const handleClear = () => {
    setItems(getAllContent());
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">Content Library</h1>
          <p className="text-sm text-text-secondary mt-0.5">{items.length} item(s)</p>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            Delete ({selectedIds.size})
          </Button>
        )}
      </header>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-border space-y-3">
        <Input
          placeholder="Search content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-3">
          {/* Type filters */}
          {(['all', 'lecture', 'pre-lecture', 'assignment'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filterType === type ? 'bg-accent text-white' : 'bg-sidebar text-text-secondary hover:text-text-primary'
              }`}
            >
              {type === 'all' ? 'All' : type === 'pre-lecture' ? 'Pre-Lecture' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-sm border border-border rounded-md px-2 py-1"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A-Z</option>
          </select>

          <Button variant="ghost" size="sm" onClick={handleClear}>Refresh</Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-lg">No content yet</p>
            <p className="text-sm mt-1">Generate your first content on the home page</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Content">
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete {selectedIds.size} item(s)? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/content/page.tsx
git commit -m "feat: add content library page with search and filters"
```

---

### Task 6.4: Content Viewer (/content/[id])

**Files:**
- Create: `src/app/content/[id]/page.tsx`

- [ ] **Step 1: Write src/app/content/[id]/page.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentById, updateContent, deleteContent } from '@/lib/storage';
import { downloadMarkdown } from '@/lib/export/markdown';
import { downloadPDF } from '@/lib/export/pdf';
import { downloadCSV, parseAssignmentMarkdown } from '@/lib/export/csv';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { ExportMenu } from '@/components/ExportMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function ContentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [markdown, setMarkdown] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentType, setContentType] = useState<string>('');

  useEffect(() => {
    const item = getContentById(id);
    if (!item) {
      router.push('/content');
      return;
    }
    setMarkdown(item.markdown);
    setTitle(item.title);
    setContentType(item.type);
  }, [id, router]);

  const handleSave = () => {
    updateContent(id, { markdown, title });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteContent(id);
    router.push('/content');
  };

  const handleExportMarkdown = () => downloadMarkdown(title || 'content', markdown);
  const handleExportPDF = () => downloadPDF('markdown-preview', title || 'content');
  const handleExportCSV = () => {
    const rows = parseAssignmentMarkdown(markdown);
    downloadCSV(rows, title || 'assignment');
  };

  if (!markdown) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
            placeholder="Untitled"
            disabled={!isEditing}
          />
          <Badge variant={contentType as any}>{contentType}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
              <ExportMenu
                onExportMarkdown={handleExportMarkdown}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                showCSV={contentType === 'assignment'}
              />
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(true)}>Delete</Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <div className="h-full p-8">
            <MarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              className="h-full"
            />
          </div>
        ) : (
          <div className="p-8">
            <div id="markdown-preview">
              <MarkdownPreview content={markdown} />
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Content">
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete this content? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/content/[id]/page.tsx
git commit -m "feat: add content viewer/editor page"
```

---

### Task 6.5: Settings Page (/settings)

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Write src/app/settings/page.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AIProvider } from '@/lib/types';
import { getStorageStats, shouldWarnStorage, clearAllContent } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

const PROVIDERS: { id: AIProvider; name: string; key: string; envKey: string }[] = [
  { id: 'openai', name: 'OpenAI', key: 'news13n_apikey_openai', envKey: 'OPENAI_API_KEY' },
  { id: 'minimax', name: 'MiniMax', key: 'news13n_apikey_minimax', envKey: 'MINIMAX_API_KEY' },
  { id: 'gemini', name: 'Gemini', key: 'news13n_apikey_gemini', envKey: 'GEMINI_API_KEY' },
  { id: 'xai', name: 'xAI', key: 'news13n_apikey_xai', envKey: 'XAI_API_KEY' },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<AIProvider, string>>({
    openai: '', minimax: '', gemini: '', xai: '',
  });
  const [saved, setSaved] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [stats, setStats] = useState({ usedBytes: 0, maxBytes: 5 * 1024 * 1024, itemCount: 0 });
  const [warnStorage, setWarnStorage] = useState(false);

  useEffect(() => {
    // Load saved keys
    for (const p of PROVIDERS) {
      const stored = localStorage.getItem(p.key);
      if (stored) setKeys(k => ({ ...k, [p.id]: stored }));
    }
    setStats(getStorageStats());
    setWarnStorage(shouldWarnStorage());
  }, []);

  const handleSave = (provider: AIProvider) => {
    const key = keys[provider];
    if (key) {
      localStorage.setItem(`news13n_apikey_${provider}`, key);
    } else {
      localStorage.removeItem(`news13n_apikey_${provider}`);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearStorage = () => {
    clearAllContent();
    setStats({ usedBytes: 0, maxBytes: 5 * 1024 * 1024, itemCount: 0 });
    setShowClearModal(false);
  };

  const usedMB = (stats.usedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (stats.maxBytes / (1024 * 1024)).toFixed(0);
  const usagePercent = (stats.usedBytes / stats.maxBytes * 100).toFixed(1);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-text-secondary mt-0.5">Configure API keys and preferences</p>
        </div>
        {saved && <span className="text-sm text-success">Saved!</span>}
      </header>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-8 max-w-2xl">
        {/* API Keys */}
        <section>
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-text-secondary mb-4">
            Keys saved here are stored in your browser only. You can also set env vars:{' '}
            <code className="bg-sidebar px-1 rounded text-xs">{PROVIDERS.map(p => p.envKey).join(', ')}</code>
          </p>

          <div className="space-y-4">
            {PROVIDERS.map(({ id, name }) => (
              <div key={id} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium">{name}</div>
                <Input
                  type="password"
                  value={keys[id]}
                  onChange={(e) => setKeys(k => ({ ...k, [id]: e.target.value }))}
                  placeholder={`Your ${name} API key`}
                  className="flex-1"
                />
                <Button variant="secondary" size="sm" onClick={() => handleSave(id)}>Save</Button>
              </div>
            ))}
          </div>
        </section>

        {/* Storage */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Storage</h2>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Used</span>
              <span className="text-sm font-medium">{usedMB} MB / {maxMB} MB</span>
            </div>
            <div className="w-full bg-sidebar rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${warnStorage ? 'bg-warning' : 'bg-accent'}`}
                style={{ width: `${Math.min(parseFloat(usagePercent), 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{stats.itemCount} item(s)</span>
              {warnStorage && (
                <span className="text-warning">
                  Storage is getting full. Consider clearing old content.
                </span>
              )}
            </div>
          </Card>

          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={() => setShowClearModal(true)}>
              Clear All Content
            </Button>
          </div>
        </section>
      </div>

      {/* Clear Storage Modal */}
      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear All Content">
        <p className="text-sm text-text-secondary mb-4">
          This will permanently delete all saved content from your browser storage. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleClearStorage}>Clear All</Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page with API key management"
```

---

## Track 7: Prompts Update

**Owner:** prompts-agent
**Prerequisites:** Design spec reviewed

### Task 7.1: Update Assignment Prompt

The assignment prompt needs to be updated to produce the structured markdown format defined in the design spec.

**Files:**
- Modify: `Prompts/assignment prompt.md`

- [ ] **Step 1: Review current prompt and update output format sections**

This task requires modifying the existing assignment prompt to change the output format. The quality requirements (Bloom's taxonomy, scenario-based questions, distractor construction rules, etc.) should be preserved. Only the output format should change to match the structured format:

```
**Question 1 (MCQ)**
[scenario question]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answer:** B
**Difficulty:** 0
**Explanation:** [explanation]

[repeat for all MCQs and MSQs...]

**Question 9 (Subjective)**
[scenario question]

**Deliverables:**
- [deliverable 1]
- [deliverable 2]

**Constraints:**
- [constraint 1]
- [constraint 2]

**Evaluation Criteria:**
1. [criterion 1]
2. [criterion 2]

**Model Answer:**
[answer]
```

Update the Output Format section of the existing prompt to match this structure, and update the quality checklist accordingly.

- [ ] **Step 2: Commit**

```bash
git add Prompts/assignment\ prompt.md
git commit -m "feat: update assignment prompt to structured markdown format"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Skim each section of the design spec. Each requirement maps to a task above.
- [ ] Placeholder scan: No "TBD", "TODO", or vague descriptions in task steps.
- [ ] Type consistency: All interfaces used consistently across tasks (ContentItem, GenerationInput, etc.)
- [ ] Dependencies: All prerequisites are tracked

## Implementation Order

1. **Track 1** (scaffold + types + UI primitives) — foundation, no dependencies
2. **Track 2** (storage + export) — depends on types
3. **Track 3** (parsers) — depends on types
4. **Track 4** (AI client + pipeline) — depends on types
5. **Track 5** (components) — depends on track 1
6. **Track 6** (pages) — depends on tracks 1-5
7. **Track 7** (prompts update) — independent, can run in parallel with tracks 5-6
