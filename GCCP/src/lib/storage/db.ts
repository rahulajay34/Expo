import Dexie, { type EntityTable } from 'dexie';

export interface StoredGeneration {
  id?: number;
  topic: string;
  subtopics: string[];
  contentType: 'lecture' | 'pre-read' | 'assignment';
  content: string;
  formattedContent?: string;
  questions?: Array<{
    id: string;
    type: 'MCSC' | 'MCMC' | 'Subjective';
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
  }>;
  gapAnalysis?: {
    covered: string[];
    partial: string[];
    missing: string[];
  };
  instructorQuality?: {
    clarity: number;
    examples: number;
    depth: number;
    engagement: number;
    overall: number;
    summary: string;
    suggestions: string[];
  };
  transcript?: string;
  costDetails: {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    perAgent: Record<string, { inputTokens: number; outputTokens: number; cost: number }>;
  };
  /** Auto-generated and user-managed content tags. */
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const db = new Dexie('GCCPDatabase') as Dexie & {
  generations: EntityTable<StoredGeneration, 'id'>;
};

db.version(1).stores({
  generations: '++id, topic, contentType, createdAt',
});

export { db };

// Max 50 generations - auto-prune oldest
const MAX_GENERATIONS = 50;

export async function saveGeneration(generation: Omit<StoredGeneration, 'id'>): Promise<number> {
  const count = await db.generations.count();
  if (count >= MAX_GENERATIONS) {
    const oldest = await db.generations.orderBy('createdAt').first();
    if (oldest?.id) {
      await db.generations.delete(oldest.id);
    }
  }
  const id = await db.generations.add(generation);
  return id as number;
}

export async function getAllGenerations(): Promise<StoredGeneration[]> {
  return db.generations.orderBy('createdAt').reverse().toArray();
}

export async function getGeneration(id: number): Promise<StoredGeneration | undefined> {
  return db.generations.get(id);
}

export async function deleteGeneration(id: number): Promise<void> {
  await db.generations.delete(id);
}

export async function clearAllGenerations(): Promise<void> {
  await db.generations.clear();
}

export async function getGenerationCount(): Promise<number> {
  return db.generations.count();
}

export async function getTotalCost(): Promise<number> {
  const all = await db.generations.toArray();
  return all.reduce((sum, g) => sum + (g.costDetails?.totalCost || 0), 0);
}

export async function getLatestGenerationDate(): Promise<Date | null> {
  const latest = await db.generations.orderBy('createdAt').last();
  return latest?.createdAt || null;
}

export async function updateGenerationTags(id: number, tags: string[]): Promise<void> {
  await db.generations.update(id, { tags, updatedAt: new Date() });
}
