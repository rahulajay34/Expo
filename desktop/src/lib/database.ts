import Database from '@tauri-apps/plugin-sql';
import type { ApiKey, Model, AgentPrompt, Generation } from '../types';
import { DEFAULT_PROMPTS } from './prompt-defaults';

let db: Database;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  label TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  top_p REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, model_id)
);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  mode TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  final_content TEXT,
  pipeline_log TEXT,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

function uuid(): string {
  return crypto.randomUUID();
}

const DEFAULT_MODELS: Omit<Model, 'created_at'>[] = [
  { id: '', provider: 'openai', model_id: 'gpt-4o', display_name: 'GPT-4o', is_custom: 0, is_default: 1, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'openai', model_id: 'gpt-4o-mini', display_name: 'GPT-4o Mini', is_custom: 0, is_default: 0, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'openai', model_id: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', is_custom: 0, is_default: 0, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'anthropic', model_id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4', is_custom: 0, is_default: 1, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'anthropic', model_id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', is_custom: 0, is_default: 0, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'gemini', model_id: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', is_custom: 0, is_default: 1, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'gemini', model_id: 'gemini-2.5-flash', display_name: 'Gemini 2.5 Flash', is_custom: 0, is_default: 0, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'xai', model_id: 'grok-3', display_name: 'Grok 3', is_custom: 0, is_default: 1, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
  { id: '', provider: 'xai', model_id: 'grok-3-mini', display_name: 'Grok 3 Mini', is_custom: 0, is_default: 0, max_tokens: 4096, temperature: 0.7, top_p: 1.0 },
];

async function seedDefaults(): Promise<void> {
  try {
    // Seed models
    for (const model of DEFAULT_MODELS) {
      const existing = await db.select<Model[]>(
        'SELECT id FROM models WHERE provider = ? AND model_id = ?',
        [model.provider, model.model_id]
      );
      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO models (id, provider, model_id, display_name, is_custom, is_default, max_tokens, temperature, top_p) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuid(), model.provider, model.model_id, model.display_name, model.is_custom, model.is_default, model.max_tokens, model.temperature, model.top_p]
        );
      }
    }

    // Seed prompts
    for (const prompt of DEFAULT_PROMPTS) {
      const existing = await db.select<AgentPrompt[]>(
        'SELECT id FROM prompts WHERE agent_name = ?',
        [prompt.agent_name]
      );
      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO prompts (id, agent_name, display_name, category, description, prompt_text, is_custom) VALUES (?, ?, ?, ?, ?, ?, 0)',
          [uuid(), prompt.agent_name, prompt.display_name, prompt.category, prompt.description, prompt.prompt_text]
        );
      }
    }

    // Seed default settings
    const defaultSettings: Record<string, string> = {
      theme: 'light',
      default_provider: 'openai',
      default_model: 'gpt-4o',
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
      const existing = await db.select<{ key: string }[]>(
        'SELECT key FROM settings WHERE key = ?',
        [key]
      );
      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
    }
  } catch (error) {
    console.error('Failed to seed defaults:', error);
  }
}

export async function initDatabase(): Promise<void> {
  try {
    db = await Database.load('sqlite:gccp.db');
    const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await db.execute(stmt + ';');
    }
    await seedDefaults();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Settings
export async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return rows.length > 0 ? rows[0].value : null;
  } catch (error) {
    console.error('Failed to get setting:', error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, value]
    );
  } catch (error) {
    console.error('Failed to set setting:', error);
  }
}

// API Keys
export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    return await db.select<ApiKey[]>('SELECT * FROM api_keys ORDER BY provider');
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return [];
  }
}

export async function getApiKey(provider: string): Promise<ApiKey | null> {
  try {
    const rows = await db.select<ApiKey[]>(
      'SELECT * FROM api_keys WHERE provider = ? AND is_active = 1',
      [provider]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Failed to get API key:', error);
    return null;
  }
}

export async function saveApiKey(provider: string, key: string, label?: string): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO api_keys (id, provider, api_key, label, is_active, updated_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'))
       ON CONFLICT(provider) DO UPDATE SET api_key = excluded.api_key, label = excluded.label, is_active = 1, updated_at = datetime('now')`,
      [uuid(), provider, key, label ?? null]
    );
  } catch (error) {
    console.error('Failed to save API key:', error);
  }
}

export async function deleteApiKey(id: string): Promise<void> {
  try {
    await db.execute('DELETE FROM api_keys WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete API key:', error);
  }
}

// Models
export async function getModels(provider?: string): Promise<Model[]> {
  try {
    if (provider) {
      return await db.select<Model[]>(
        'SELECT * FROM models WHERE provider = ? ORDER BY is_default DESC, display_name',
        [provider]
      );
    }
    return await db.select<Model[]>('SELECT * FROM models ORDER BY provider, is_default DESC, display_name');
  } catch (error) {
    console.error('Failed to get models:', error);
    return [];
  }
}

export async function saveModel(
  provider: string,
  modelId: string,
  displayName: string,
  isCustom: boolean = false
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO models (id, provider, model_id, display_name, is_custom, is_default, max_tokens, temperature, top_p)
       VALUES (?, ?, ?, ?, ?, 0, 4096, 0.7, 1.0)
       ON CONFLICT(provider, model_id) DO UPDATE SET display_name = excluded.display_name`,
      [uuid(), provider, modelId, displayName, isCustom ? 1 : 0]
    );
  } catch (error) {
    console.error('Failed to save model:', error);
  }
}

export async function deleteModel(id: string): Promise<void> {
  try {
    await db.execute('DELETE FROM models WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete model:', error);
  }
}

export async function setDefaultModel(id: string): Promise<void> {
  try {
    // Get the model to find its provider
    const rows = await db.select<Model[]>('SELECT * FROM models WHERE id = ?', [id]);
    if (rows.length === 0) return;
    const provider = rows[0].provider;
    // Clear default for all models of the same provider, then set this one
    await db.execute('UPDATE models SET is_default = 0 WHERE provider = ?', [provider]);
    await db.execute('UPDATE models SET is_default = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to set default model:', error);
  }
}

// Also allow deleting by provider for API key convenience
export async function deleteApiKeyByProvider(provider: string): Promise<void> {
  try {
    await db.execute('DELETE FROM api_keys WHERE provider = ?', [provider]);
  } catch (error) {
    console.error('Failed to delete API key:', error);
  }
}

// Prompts
export async function getPrompts(): Promise<AgentPrompt[]> {
  try {
    return await db.select<AgentPrompt[]>('SELECT * FROM prompts ORDER BY category, display_name');
  } catch (error) {
    console.error('Failed to get prompts:', error);
    return [];
  }
}

export async function getPrompt(agentName: string): Promise<AgentPrompt | null> {
  try {
    const rows = await db.select<AgentPrompt[]>(
      'SELECT * FROM prompts WHERE agent_name = ?',
      [agentName]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Failed to get prompt:', error);
    return null;
  }
}

export async function savePrompt(agentName: string, text: string): Promise<void> {
  try {
    await db.execute(
      `UPDATE prompts SET prompt_text = ?, is_custom = 1, updated_at = datetime('now') WHERE agent_name = ?`,
      [text, agentName]
    );
  } catch (error) {
    console.error('Failed to save prompt:', error);
  }
}

export async function resetPrompt(agentName: string): Promise<void> {
  try {
    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.agent_name === agentName);
    if (defaultPrompt) {
      await db.execute(
        `UPDATE prompts SET prompt_text = ?, is_custom = 0, updated_at = datetime('now') WHERE agent_name = ?`,
        [defaultPrompt.prompt_text, agentName]
      );
    }
  } catch (error) {
    console.error('Failed to reset prompt:', error);
  }
}

export async function deletePrompt(id: string): Promise<void> {
  try {
    // Reset to default rather than actually deleting
    const rows = await db.select<AgentPrompt[]>('SELECT agent_name FROM prompts WHERE id = ?', [id]);
    if (rows.length > 0) {
      await resetPrompt(rows[0].agent_name);
    }
  } catch (error) {
    console.error('Failed to delete prompt:', error);
  }
}

// Generations
export async function getGenerations(filters?: { search?: string; mode?: string; favorite?: boolean }): Promise<Generation[]> {
  try {
    let query = 'SELECT * FROM generations WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.search) {
      query += ' AND (title LIKE ? OR topic LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (filters?.mode) {
      query += ' AND mode = ?';
      params.push(filters.mode);
    }
    if (filters?.favorite) {
      query += ' AND is_favorite = 1';
    }

    query += ' ORDER BY created_at DESC';
    return await db.select<Generation[]>(query, params);
  } catch (error) {
    console.error('Failed to get generations:', error);
    return [];
  }
}

export async function saveGeneration(gen: Omit<Generation, 'created_at'>): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO generations (id, title, topic, subject, grade_level, mode, provider, model, final_content, pipeline_log, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gen.id, gen.title, gen.topic, gen.subject ?? null, gen.grade_level ?? null, gen.mode, gen.provider, gen.model, gen.final_content ?? null, gen.pipeline_log ?? null, gen.is_favorite ?? 0]
    );
  } catch (error) {
    console.error('Failed to save generation:', error);
  }
}

export async function deleteGeneration(id: string): Promise<void> {
  try {
    await db.execute('DELETE FROM generations WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete generation:', error);
  }
}

export async function toggleFavorite(id: string): Promise<void> {
  try {
    await db.execute(
      'UPDATE generations SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await db.execute('DELETE FROM generations');
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

export async function resetAllSettings(): Promise<void> {
  try {
    await db.execute('DELETE FROM settings');
    await db.execute('DELETE FROM api_keys');
    await db.execute('DELETE FROM models WHERE is_custom = 1');
    await db.execute('UPDATE prompts SET prompt_text = prompt_text, is_custom = 0');
    await seedDefaults();
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

export async function exportAllData(): Promise<string> {
  try {
    const apiKeys = await getApiKeys();
    const models = await getModels();
    const prompts = await getPrompts();
    const generations = await getGenerations();
    const settings: Record<string, string> = {};

    const rows = await db.select<{ key: string; value: string }[]>('SELECT key, value FROM settings');
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return JSON.stringify({ apiKeys, models, prompts, generations, settings }, null, 2);
  } catch (error) {
    console.error('Failed to export data:', error);
    return '{}';
  }
}
