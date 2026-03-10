# GCCP - Generated Course Content Platform

AI-powered educational content generation platform. Create Lecture Notes, Pre-Reads, and Assignments in ~90 seconds using a 7-agent AI pipeline.

## Features

- **7-Agent AI Pipeline**: CourseDetector, Analyzer, Creator, Sanitizer, Reviewer, Refiner, Formatter
- **3 Content Types**: Lecture Notes (deep dive), Pre-Reads (primers), Assignments (Bloom's taxonomy aligned)
- **Real-Time Streaming**: Watch content generate word-by-word
- **Transcript Analysis**: Gap analysis and instructor quality evaluation
- **Assignment Workspace**: Interactive table editor with card view, CSV export
- **Local-First**: All data stored in browser IndexedDB, no login required
- **SheetForge**: Built-in Excel grade tracker generator
- **Dark Mode**: Full light/dark theme support
- **Responsive**: Works on mobile, tablet, and desktop

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion 12 |
| State | Zustand 5 |
| Storage | Dexie.js (IndexedDB) |
| AI | Google Generative AI SDK (Gemini) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Tables | TanStack Table |
| Excel | ExcelJS |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Google Gemini API key

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx           # Landing page
│   ├── editor/            # Content generator workspace
│   ├── archives/          # Saved generations library
│   ├── settings/          # App settings
│   ├── sheetforge/        # Excel grade tracker tool
│   └── api/               # API routes (generate, health)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Sidebar, Navbar
│   ├── features/          # Feature components
│   └── animations/        # Animation wrappers
├── lib/
│   ├── ai/                # AI pipeline (agents, prompts, cache)
│   ├── storage/           # IndexedDB layer
│   ├── store/             # Zustand state
│   ├── hooks/             # Custom hooks
│   ├── validators/        # Zod schemas
│   ├── constants/         # App constants
│   ├── types/             # TypeScript types
│   └── sheetforge/        # SheetForge logic
└── config/                # Site and navigation config
```

## Environment Variables

| Variable | Description | Required |
|----------|-----------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

## License

Private
