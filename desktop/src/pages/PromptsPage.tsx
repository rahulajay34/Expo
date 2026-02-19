import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { getPrompts, savePrompt, deletePrompt } from '../lib/database';
import { DEFAULT_PROMPTS } from '../lib/prompt-defaults';
import type { AgentPrompt } from '../types';

const agentList = DEFAULT_PROMPTS.map((p) => ({
  id: p.agent_name,
  label: p.display_name,
  category: p.category,
  description: p.description || '',
}));

const categories = [...new Set(agentList.map((a) => a.category))];

function getDefaultPromptText(agentName: string): string {
  return DEFAULT_PROMPTS.find((p) => p.agent_name === agentName)?.prompt_text || '';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function PromptsPage() {
  const { addToast } = useStore();
  const [prompts, setPrompts] = useState<AgentPrompt[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(agentList[0].id);
  const [editContent, setEditContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => { loadPrompts(); }, []);

  useEffect(() => {
    const saved = prompts.find((p) => p.agent_name === selectedAgent);
    setEditContent(saved?.prompt_text || getDefaultPromptText(selectedAgent));
    setIsDirty(false);
    setShowDiff(false);
  }, [selectedAgent, prompts]);

  const loadPrompts = useCallback(async () => {
    try {
      setPrompts(await getPrompts());
    } catch (e: unknown) {
      console.error('Failed to load prompts:', e);
    }
  }, []);

  const handleSave = useCallback(async () => {
    await savePrompt(selectedAgent, editContent.trim());
    await loadPrompts();
    setIsDirty(false);
    addToast({ type: 'success', message: `${selectedAgent} prompt saved` });
  }, [selectedAgent, editContent, loadPrompts, addToast]);

  const handleReset = useCallback(async () => {
    const saved = prompts.find((p) => p.agent_name === selectedAgent);
    if (saved) {
      await deletePrompt(saved.id);
      await loadPrompts();
    }
    setEditContent(getDefaultPromptText(selectedAgent));
    setIsDirty(false);
    addToast({ type: 'success', message: `${selectedAgent} prompt reset to default` });
  }, [selectedAgent, prompts, loadPrompts, addToast]);

  const isCustom = prompts.some((p) => p.agent_name === selectedAgent && p.is_custom === 1);
  const defaultText = getDefaultPromptText(selectedAgent);
  const currentAgent = agentList.find((a) => a.id === selectedAgent);
  const charCount = editContent.length;
  const tokenEstimate = estimateTokens(editContent);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agentList;
    const q = search.toLowerCase();
    return agentList.filter(
      (a) => a.label.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => filteredAgents.some((a) => a.category === c));
  }, [filteredAgents]);

  return (
    <div className="flex h-full" style={{ paddingTop: '38px' }}>
      {/* Agent list sidebar */}
      <div className="w-[240px] flex-shrink-0 overflow-y-auto border-r border-border bg-card/30">
        <div className="p-3">
          <div className="relative mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {filteredCategories.map((category) => (
            <div key={category} className="mb-3">
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                {category}
              </h3>
              <div className="flex flex-col gap-0.5">
                {filteredAgents
                  .filter((a) => a.category === category)
                  .map((agent) => {
                    const hasCustom = prompts.some((p) => p.agent_name === agent.id && p.is_custom === 1);
                    const isSelected = selectedAgent === agent.id;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className={`relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-all ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary" />
                        )}
                        <span className="truncate font-medium">{agent.label}</span>
                        {hasCustom && (
                          <span className="ml-auto flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">
              {currentAgent?.label}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isCustom ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">CUSTOM</span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">DEFAULT</span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {charCount.toLocaleString()} chars · ~{tokenEstimate.toLocaleString()} tokens
              </span>
              {isDirty && <span className="text-[11px] font-medium text-warning">Unsaved changes</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCustom && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  showDiff ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Compare
              </button>
            )}
            {isCustom && (
              <button
                onClick={handleReset}
                className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save (⌘S)
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <textarea
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                setIsDirty(true);
              }}
              className="flex-1 resize-none border-none bg-background p-6 font-mono text-sm text-foreground leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
              placeholder="Enter custom system prompt..."
              spellCheck={false}
            />
          </div>

          {/* Compare panel */}
          {showDiff && (
            <div className="w-[50%] flex-shrink-0 border-l border-border overflow-y-auto bg-muted/20">
              <div className="px-4 py-2 border-b border-border bg-muted/50">
                <span className="text-xs font-semibold text-muted-foreground">Default Prompt</span>
              </div>
              <pre className="p-6 text-sm font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {defaultText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
