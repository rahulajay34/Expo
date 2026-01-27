import Dexie from 'dexie';
import { GenerationState, ContentMode } from '@/types/content';

export interface LMSExport {
  id?: number;
  content: string;
  type: ContentMode;
  timestamp: Date;
  status: 'ready' | 'exported';
}

export class AppDatabase extends Dexie {
  generations!: any;
  lmsExports!: any;

  constructor() {
    super('AgenticCoreDB');
    (this as any).version(1).stores({
      generations: '++id, topic, mode, status, createdAt',
      lmsExports: '++id, type, status, timestamp'
    });
  }
}

export const db = new AppDatabase();
