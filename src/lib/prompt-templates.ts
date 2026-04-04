const STORAGE_KEY = 'news13n_prompt_templates';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export function getAllTemplates(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return getAllTemplates().find(t => t.id === id);
}

export function saveTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt'>): PromptTemplate {
  const templates = getAllTemplates();
  const newTemplate: PromptTemplate = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<Pick<PromptTemplate, 'name' | 'content'>>): void {
  const templates = getAllTemplates();
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return;
  templates[idx] = { ...templates[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function deleteTemplate(id: string): void {
  const templates = getAllTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
