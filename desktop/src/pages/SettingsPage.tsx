import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  getModels,
  saveModel,
  deleteModel,
  setDefaultModel,
  clearHistory,
  resetAllSettings,
  exportAllData,
} from '../lib/database';
import type { ApiKey, Model } from '../types';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', color: 'bg-green-500', desc: 'GPT-4o, GPT-4 Turbo' },
  { id: 'anthropic', label: 'Anthropic', color: 'bg-orange-500', desc: 'Claude Sonnet, Haiku' },
  { id: 'gemini', label: 'Google Gemini', color: 'bg-blue-500', desc: 'Gemini 2.5 Pro, Flash' },
  { id: 'xai', label: 'xAI', color: 'bg-purple-500', desc: 'Grok 3, Grok 3 Mini' },
];

function ApiKeyCard({
  provider,
  existingKey,
  onSave,
  onDelete,
}: {
  provider: typeof PROVIDERS[number];
  existingKey: ApiKey | undefined;
  onSave: (provider: string, key: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    await onSave(provider.id, keyValue.trim());
    setKeyValue('');
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${provider.color}`} />
          <span className="text-sm font-semibold text-foreground">{provider.label}</span>
        </div>
        {existingKey ? (
          <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
            Connected
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Not configured
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{provider.desc}</p>

      {existingKey && !editing ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground truncate">
            {showKey ? existingKey.api_key : `${'•'.repeat(20)}${existingKey.api_key.slice(-4)}`}
          </code>
          <button
            onClick={() => setShowKey(!showKey)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { setEditing(true); setKeyValue(''); }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit key"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(existingKey.id)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            title="Delete key"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder={`Paste ${provider.label} API key...`}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!keyValue.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          {editing && (
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme, addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'api-keys' | 'models' | 'appearance' | 'data'>('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [newModelProvider, setNewModelProvider] = useState('openai');
  const [newModelId, setNewModelId] = useState('');
  const [newModelLabel, setNewModelLabel] = useState('');

  const loadData = useCallback(async () => {
    try {
      setApiKeys(await getApiKeys());
      setModels(await getModels());
    } catch (e: unknown) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveKey = async (provider: string, key: string) => {
    await saveApiKey(provider, key);
    await loadData();
    addToast({ type: 'success', message: `${provider} API key saved` });
  };

  const handleDeleteKey = async (id: string) => {
    await deleteApiKey(id);
    await loadData();
    addToast({ type: 'success', message: 'API key deleted' });
  };

  const handleAddModel = async () => {
    if (!newModelId.trim() || !newModelLabel.trim()) return;
    await saveModel(newModelProvider, newModelId.trim(), newModelLabel.trim(), true);
    setNewModelId('');
    setNewModelLabel('');
    await loadData();
    addToast({ type: 'success', message: 'Model added' });
  };

  const handleDeleteModel = async (id: string) => {
    await deleteModel(id);
    await loadData();
    addToast({ type: 'success', message: 'Model deleted' });
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultModel(id);
    await loadData();
    addToast({ type: 'success', message: 'Default model updated' });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    addToast({ type: 'success', message: 'Generation history cleared' });
  };

  const handleResetAll = async () => {
    await resetAllSettings();
    await loadData();
    addToast({ type: 'success', message: 'All settings reset to defaults' });
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gccp-export.json';
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Data exported' });
  };

  const groupedModels = PROVIDERS.map((p) => ({
    provider: p,
    models: models.filter((m) => m.provider === p.id),
  }));

  const tabs = [
    { id: 'api-keys' as const, label: 'API Keys', icon: '🔑' },
    { id: 'models' as const, label: 'Models', icon: '🤖' },
    { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
    { id: 'data' as const, label: 'Data', icon: '💾' },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: '38px' }}>
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">Configure AI providers, models, and preferences.</p>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">
              Add API keys for each AI provider. Keys are stored locally in your SQLite database — never sent to any server.
            </p>
            {PROVIDERS.map((p) => (
              <ApiKeyCard
                key={p.id}
                provider={p}
                existingKey={apiKeys.find((k) => k.provider === p.id)}
                onSave={handleSaveKey}
                onDelete={handleDeleteKey}
              />
            ))}
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">
              The default model per provider is used for all pipeline agents. Add custom models as needed.
            </p>

            {groupedModels.map(({ provider, models: providerModels }) => (
              <div key={provider.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2.5 border-b border-border">
                  <span className={`h-2 w-2 rounded-full ${provider.color}`} />
                  <span className="text-sm font-semibold text-foreground">{provider.label}</span>
                  <span className="text-xs text-muted-foreground">({providerModels.length} models)</span>
                </div>
                {providerModels.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No models configured.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {providerModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{model.display_name}</span>
                          <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{model.model_id}</code>
                          {model.is_default === 1 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEFAULT</span>
                          )}
                          {model.is_custom === 1 && (
                            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">CUSTOM</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {model.is_default !== 1 && (
                            <button
                              onClick={() => handleSetDefault(model.id)}
                              className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                            >
                              Set Default
                            </button>
                          )}
                          {model.is_custom === 1 && (
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add custom model */}
            <div className="rounded-xl border border-dashed border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add Custom Model</h3>
              <div className="flex gap-2">
                <select
                  value={newModelProvider}
                  onChange={(e) => setNewModelProvider(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="Model ID (e.g. gpt-4o)"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={newModelLabel}
                  onChange={(e) => setNewModelLabel(e.target.value)}
                  placeholder="Display Name"
                  className="w-36 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddModel}
                  disabled={!newModelId.trim() || !newModelLabel.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Theme</h3>
              <p className="text-xs text-muted-foreground mb-3">Choose light, dark, or match your system preference.</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'light' as const, label: 'Light', icon: '☀️' },
                  { id: 'dark' as const, label: 'Dark', icon: '🌙' },
                  { id: 'system' as const, label: 'System', icon: '💻' },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      theme === t.id
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-input bg-background hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">
              All data is stored locally in a SQLite database on your machine. Nothing leaves your computer.
            </p>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">Database Location</h3>
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md block break-all">
                ~/Library/Application Support/com.gccp.desktop/gccp.db
              </code>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Export Data</h3>
              <p className="text-xs text-muted-foreground mb-3">Export all settings, API keys, models, prompts, and generations as JSON.</p>
              <button
                onClick={handleExport}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Export All Data
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Clear History</h3>
              <p className="text-xs text-muted-foreground mb-3">Delete all saved generations. This cannot be undone.</p>
              <button
                onClick={handleClearHistory}
                className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Clear All History
              </button>
            </div>

            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 p-4">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mb-3">Reset everything to factory defaults. Deletes API keys, custom models, and custom prompts.</p>
              <button
                onClick={handleResetAll}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Reset All Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
