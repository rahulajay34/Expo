'use client';

import { useState, useEffect } from 'react';
import { AIProvider } from '@/lib/types';
import { getStorageStats, shouldWarnStorage, clearAllContent } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface ProviderConfig {
  id: AIProvider;
  name: string;
  placeholder: string;
  docsUrl: string;
  defaultModel: string;
  models: { id: string; label: string; note?: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-5.4',
    models: [
      { id: 'gpt-5.4',      label: 'GPT-5.4',       note: 'Recommended' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',  note: 'Faster'      },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano',  note: 'Lightest'    },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    placeholder: 'eyJ...',
    docsUrl: 'https://www.minimax.chat/',
    defaultModel: 'MiniMax-M2.7',
    models: [
      { id: 'MiniMax-M2.7', label: 'MiniMax-M2.7', note: 'Recommended' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',        note: 'Recommended' },
      { id: 'gemini-2.0-flash-lite',  label: 'Gemini 2.0 Flash Lite',   note: 'Fastest' },
      { id: 'gemini-1.5-pro',         label: 'Gemini 1.5 Pro',          note: 'Most capable' },
      { id: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash'                            },
    ],
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    placeholder: 'xai-...',
    docsUrl: 'https://console.x.ai/',
    defaultModel: 'grok-3',
    models: [
      { id: 'grok-3',       label: 'Grok 3',        note: 'Recommended' },
      { id: 'grok-3-mini',  label: 'Grok 3 Mini',   note: 'Faster' },
      { id: 'grok-2',       label: 'Grok 2'                          },
      { id: 'grok-2-mini',  label: 'Grok 2 Mini'                     },
    ],
  },
];

export function getSavedModel(provider: AIProvider): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(`news13n_model_${provider}`) ??
    PROVIDERS.find(p => p.id === provider)?.defaultModel ??
    ''
  );
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<AIProvider, string>>({
    openai: '', minimax: '', gemini: '', xai: '',
  });
  const [models, setModels] = useState<Record<AIProvider, string>>({
    openai: 'gpt-4o',
    minimax: 'MiniMax-Text-01',
    gemini: 'gemini-2.0-flash',
    xai: 'grok-3',
  });
  const [savedProvider, setSavedProvider] = useState<AIProvider | null>(null);
  const [modelSavedProvider, setModelSavedProvider] = useState<AIProvider | null>(null);
  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({
    openai: false, minimax: false, gemini: false, xai: false,
  });
  const [showClearModal, setShowClearModal] = useState(false);
  const [stats, setStats] = useState({ usedBytes: 0, maxBytes: 5 * 1024 * 1024, itemCount: 0 });
  const [warnStorage, setWarnStorage] = useState(false);

  useEffect(() => {
    // Load saved keys
    const loadedKeys = { ...keys };
    for (const p of PROVIDERS) {
      const stored = localStorage.getItem(`news13n_apikey_${p.id}`);
      if (stored) loadedKeys[p.id] = stored;
    }
    setKeys(loadedKeys);

    // Load saved models
    const loadedModels = { ...models };
    for (const p of PROVIDERS) {
      const stored = localStorage.getItem(`news13n_model_${p.id}`);
      if (stored) loadedModels[p.id] = stored;
    }
    setModels(loadedModels);

    setStats(getStorageStats());
    setWarnStorage(shouldWarnStorage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveKey = (provider: AIProvider) => {
    const key = keys[provider].trim();
    if (key) {
      localStorage.setItem(`news13n_apikey_${provider}`, key);
    } else {
      localStorage.removeItem(`news13n_apikey_${provider}`);
    }
    setSavedProvider(provider);
    setTimeout(() => setSavedProvider(null), 2000);
  };

  const handleModelChange = (provider: AIProvider, modelId: string) => {
    setModels(m => ({ ...m, [provider]: modelId }));
    localStorage.setItem(`news13n_model_${provider}`, modelId);
    // Show brief flash feedback
    setModelSavedProvider(provider);
    setTimeout(() => setModelSavedProvider(null), 1500);
  };

  const handleClearStorage = () => {
    clearAllContent();
    const fresh = getStorageStats();
    setStats(fresh);
    setWarnStorage(false);
    setShowClearModal(false);
  };

  const usedMB = (stats.usedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (stats.maxBytes / (1024 * 1024)).toFixed(0);
  const usagePercent = Math.min((stats.usedBytes / stats.maxBytes) * 100, 100);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-xs text-text-secondary mt-0.5">Configure API keys, models, and storage</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-10">

          {/* API Keys & Models */}
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-1">AI Providers</h2>
            <p className="text-xs text-text-secondary mb-5">
              API keys are stored in your browser only (localStorage) and never sent to our servers.
              Model selection is saved per provider and used automatically during generation.
            </p>

            <div className="space-y-4">
              {PROVIDERS.map(({ id, name, placeholder, docsUrl, models: providerModels }) => {
                const isSaved = savedProvider === id;
                const isModelSaved = modelSavedProvider === id;
                const hasKey = !!keys[id].trim();
                const selectedModel = models[id];
                const selectedModelLabel = providerModels.find(m => m.id === selectedModel)?.label ?? selectedModel;

                return (
                  <Card key={id} className="p-4 space-y-3">
                    {/* Provider header row */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm text-text-primary">{name}</div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          Active model: <span className="font-medium text-text-primary">{selectedModelLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasKey && (
                          <span className="text-xs text-success font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            Key set
                          </span>
                        )}
                        {(isSaved || isModelSaved) && (
                          <span className="text-xs text-success font-medium">Saved!</span>
                        )}
                        <a
                          href={docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          Get key ↗
                        </a>
                      </div>
                    </div>

                    {/* Model selector */}
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1.5">
                        Model
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {providerModels.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleModelChange(id, m.id)}
                            className={`
                              relative flex flex-col items-start px-3 py-2.5 rounded-md border text-left
                              transition-all duration-100 text-xs
                              ${selectedModel === m.id
                                ? 'border-accent bg-accent/5 shadow-sm ring-1 ring-accent/50'
                                : 'border-border hover:border-accent/40 hover:bg-sidebar/60'
                              }
                            `}
                          >
                            <span className={`font-medium ${selectedModel === m.id ? 'text-accent' : 'text-text-primary'}`}>
                              {m.label}
                            </span>
                            {m.note && (
                              <span className="text-text-secondary mt-0.5" style={{ fontSize: '10px' }}>
                                {m.note}
                              </span>
                            )}
                            {selectedModel === m.id && (
                              <span className="absolute top-2 right-2 text-accent" style={{ fontSize: '10px' }}>✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* API Key input row */}
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1.5">API Key</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type={showKeys[id] ? 'text' : 'password'}
                            value={keys[id]}
                            onChange={(e) => setKeys(k => ({ ...k, [id]: e.target.value }))}
                            placeholder={placeholder}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(id)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys(s => ({ ...s, [id]: !s[id] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
                            title={showKeys[id] ? 'Hide key' : 'Show key'}
                          >
                            {showKeys[id] ? '🙈' : '👁'}
                          </button>
                        </div>
                        <Button variant="secondary" size="md" onClick={() => handleSaveKey(id)}>
                          Save
                        </Button>
                        {hasKey && (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              setKeys(k => ({ ...k, [id]: '' }));
                              localStorage.removeItem(`news13n_apikey_${id}`);
                            }}
                            className="text-danger hover:bg-red-50"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Storage */}
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-1">Storage</h2>
            <p className="text-xs text-text-secondary mb-4">
              Content is stored in your browser&apos;s localStorage. Browsers limit this to ~5MB per origin.
            </p>

            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Storage used</span>
                <span className="text-sm font-semibold">
                  {usedMB} MB
                  <span className="text-text-secondary font-normal"> / {maxMB} MB</span>
                </span>
              </div>

              <div className="w-full bg-sidebar rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${warnStorage ? 'bg-warning' : 'bg-accent'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{stats.itemCount} item{stats.itemCount !== 1 ? 's' : ''} stored</span>
                <span>{usagePercent.toFixed(1)}% used</span>
              </div>

              {warnStorage && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
                  <span className="text-warning text-sm">⚠</span>
                  <p className="text-xs text-warning">
                    Storage is getting full. Consider deleting old content or exporting important items first.
                  </p>
                </div>
              )}
            </Card>

            <div className="mt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowClearModal(true)}
                disabled={stats.itemCount === 0}
              >
                Clear All Content
              </Button>
              <p className="text-xs text-text-secondary mt-1.5">
                This will permanently delete all {stats.itemCount} saved item{stats.itemCount !== 1 ? 's' : ''}.
              </p>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">About</h2>
            <Card className="p-4">
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Application</span>
                  <span className="text-text-primary font-medium">New-S13n</span>
                </div>
                <div className="flex justify-between">
                  <span>Version</span>
                  <span className="text-text-primary">0.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Stack</span>
                  <span className="text-text-primary">Next.js 14 · Tailwind · TypeScript</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage</span>
                  <span className="text-text-primary">Browser localStorage only</span>
                </div>
              </div>
            </Card>
          </section>

        </div>
      </div>

      {/* Clear modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Content"
      >
        <p className="text-sm text-text-secondary mb-2">
          This will permanently delete all <strong>{stats.itemCount} saved item{stats.itemCount !== 1 ? 's' : ''}</strong>
          {' '}from your browser storage.
        </p>
        <p className="text-xs text-danger mb-6">⚠ This cannot be undone. Make sure to export anything you want to keep first.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleClearStorage}>Clear All</Button>
        </div>
      </Modal>
    </div>
  );
}
