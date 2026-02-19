import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { PipelineStepper } from '../components/PipelineStepper';
import { StreamingView } from '../components/StreamingView';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { getApiKeys, getModels, saveGeneration } from '../lib/database';
import type { ContentMode, ApiKey, Model, AssignmentItem } from '../types';

const modes: { id: ContentMode; label: string; icon: string; desc: string }[] = [
  { id: 'lecture', label: 'Lecture Notes', icon: '📝', desc: 'Comprehensive notes from transcript' },
  { id: 'pre-read', label: 'Pre-Read', icon: '📖', desc: 'Brief primer material for students' },
  { id: 'assignment', label: 'Assignment', icon: '✍️', desc: 'Practice questions & assessments' },
];

function parseAssignment(raw: string): AssignmentItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    return [];
  } catch {
    return [];
  }
}

function AssignmentCard({ item, index }: { item: AssignmentItem; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const typeLabel =
    item.questionType === 'mcsc' ? 'Single Choice' :
    item.questionType === 'mcmc' ? 'Multiple Choice' :
    'Subjective';
  const typeBadgeColor =
    item.questionType === 'mcsc' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    item.questionType === 'mcmc' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadgeColor}`}>
            {typeLabel}
          </span>
          {item.difficultyLevel !== undefined && (
            <span className="text-[11px] text-muted-foreground">
              {item.difficultyLevel === 0 ? 'Easy' : item.difficultyLevel === 0.5 ? 'Medium' : 'Hard'}
            </span>
          )}
        </div>
      </div>

      <div className="prose-sm mb-3">
        <MarkdownRenderer content={item.contentBody} />
      </div>

      {/* Options for MC questions */}
      {(item.questionType === 'mcsc' || item.questionType === 'mcmc') && item.options && (
        <div className="flex flex-col gap-1.5 mb-3">
          {Object.entries(item.options).map(([key, value]) => {
            const isCorrect =
              item.questionType === 'mcsc'
                ? Number(key) === item.mcscAnswer
                : item.mcmcAnswer?.includes(key);
            return (
              <div
                key={key}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  showAnswer && isCorrect
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                    : 'border-border bg-background'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-medium flex-shrink-0 mt-0.5">
                  {String.fromCharCode(64 + Number(key))}
                </span>
                <span>{value}</span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowAnswer(!showAnswer)}
        className="text-xs font-medium text-primary hover:underline"
      >
        {showAnswer ? 'Hide Answer' : 'Show Answer'}
      </button>

      {showAnswer && item.answerExplanation && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground animate-fade-in">
          <MarkdownRenderer content={item.answerExplanation} />
        </div>
      )}
    </div>
  );
}

function GapAnalysisPanel() {
  const gapAnalysis = useStore((s) => s.gapAnalysis);
  const instructorQuality = useStore((s) => s.instructorQuality);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!gapAnalysis && !instructorQuality) return null;

  const toggle = (id: string) => setExpandedSection(expandedSection === id ? null : id);

  return (
    <div className="flex flex-col gap-3">
      {/* Gap Analysis */}
      {gapAnalysis && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button onClick={() => toggle('gap')} className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="text-sm font-semibold text-foreground">Transcript Coverage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {gapAnalysis.covered.length} covered · {gapAnalysis.notCovered.length} missing
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted-foreground transition-transform ${expandedSection === 'gap' ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          {expandedSection === 'gap' && (
            <div className="border-t border-border px-4 py-3 animate-fade-in">
              {gapAnalysis.covered.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1.5">Covered</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {gapAnalysis.covered.map((t, i) => (
                      <span key={i} className="rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs text-green-700 dark:text-green-400">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {gapAnalysis.notCovered.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">Not Covered</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {gapAnalysis.notCovered.map((t, i) => (
                      <span key={i} className="rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs text-red-700 dark:text-red-400">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {gapAnalysis.partiallyCovered.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-1.5">Partial</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {gapAnalysis.partiallyCovered.map((t, i) => (
                      <span key={i} className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs text-yellow-700 dark:text-yellow-400">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructor Quality */}
      {instructorQuality && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button onClick={() => toggle('quality')} className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-semibold text-foreground">Instructor Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                instructorQuality.overallScore >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                instructorQuality.overallScore >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {instructorQuality.overallScore}/10
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted-foreground transition-transform ${expandedSection === 'quality' ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          {expandedSection === 'quality' && (
            <div className="border-t border-border px-4 py-3 animate-fade-in">
              <p className="text-sm text-foreground mb-3">{instructorQuality.summary}</p>

              {instructorQuality.breakdown.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {instructorQuality.breakdown.map((b, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{b.criterion}</span>
                        <span className="text-xs font-bold text-primary">{b.score}/{b.weight}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{b.evidence}</p>
                    </div>
                  ))}
                </div>
              )}

              {instructorQuality.strengths.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strengths</h4>
                  <ul className="text-xs text-foreground space-y-0.5">
                    {instructorQuality.strengths.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-green-500">+</span>{s}</li>)}
                  </ul>
                </div>
              )}

              {(instructorQuality.improvementAreas.length > 0 || (instructorQuality.improvements && instructorQuality.improvements.length > 0)) && (
                <div>
                  <h4 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Areas for Improvement</h4>
                  <ul className="text-xs text-foreground space-y-0.5">
                    {(instructorQuality.improvementAreas.length > 0 ? instructorQuality.improvementAreas : instructorQuality.improvements || []).map((s, i) => (
                      <li key={i} className="flex gap-1.5"><span className="text-yellow-500">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EditorPage() {
  const {
    isGenerating,
    streamingContent,
    formattedAssignment,
    pipelineSteps,
    startGeneration,
    abortGeneration,
    resetGeneration,
    error,
    addToast,
  } = useStore();

  const [topic, setTopic] = useState('');
  const [subtopics, setSubtopics] = useState('');
  const [mode, setMode] = useState<ContentMode>('lecture');
  const [transcript, setTranscript] = useState('');
  const [mcsc, setMcsc] = useState(5);
  const [mcmc, setMcmc] = useState(3);
  const [subjective, setSubjective] = useState(2);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [assignmentView, setAssignmentView] = useState<'rendered' | 'raw'>('rendered');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      const keys = await getApiKeys();
      const allModels = await getModels();
      setApiKeys(keys);
      setModels(allModels);

      // Auto-select first provider with a key
      if (keys.length > 0 && !selectedProvider) {
        setSelectedProvider(keys[0].provider);
        const providerModels = allModels.filter(
          (m) => m.provider === keys[0].provider && m.is_default === 1
        );
        if (providerModels.length > 0) {
          setSelectedModelId(providerModels[0].model_id);
        } else {
          const first = allModels.find((m) => m.provider === keys[0].provider);
          if (first) setSelectedModelId(first.model_id);
        }
      }
    }
    loadData();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    const providerModels = models.filter((m) => m.provider === selectedProvider);
    const defaultModel = providerModels.find((m) => m.is_default === 1);
    if (defaultModel) {
      setSelectedModelId(defaultModel.model_id);
    } else if (providerModels.length > 0) {
      setSelectedModelId(providerModels[0].model_id);
    }
  }, [selectedProvider, models]);

  const availableProviders = apiKeys.map((k) => k.provider);
  const providerModels = models.filter((m) => m.provider === selectedProvider);

  const canGenerate =
    topic.trim() &&
    subtopics.trim() &&
    selectedProvider &&
    selectedModelId &&
    !isGenerating;

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    startGeneration({
      topic: topic.trim(),
      subtopics: subtopics.trim(),
      mode,
      transcript: transcript.trim() || undefined,
      assignmentCounts: mode === 'assignment' ? { mcsc, mcmc, subjective } : undefined,
    });
  }, [canGenerate, topic, subtopics, mode, transcript, mcsc, mcmc, subjective, startGeneration]);

  const handleCopy = useCallback(async () => {
    const text = formattedAssignment || streamingContent;
    await navigator.clipboard.writeText(text);
    addToast({ type: 'success', message: 'Copied to clipboard' });
  }, [streamingContent, formattedAssignment, addToast]);

  const handleExportMarkdown = useCallback(() => {
    const text = formattedAssignment || streamingContent;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.trim() || 'content'}-${mode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Exported as Markdown' });
  }, [streamingContent, formattedAssignment, topic, mode, addToast]);

  const handleSaveToHistory = useCallback(async () => {
    const content = formattedAssignment || streamingContent;
    if (!content) return;
    await saveGeneration({
      id: crypto.randomUUID(),
      title: topic.trim(),
      topic: topic.trim(),
      mode,
      provider: selectedProvider,
      model: selectedModelId,
      final_content: content,
      pipeline_log: JSON.stringify(pipelineSteps),
      is_favorite: 0,
    });
    addToast({ type: 'success', message: 'Saved to history' });
  }, [streamingContent, formattedAssignment, topic, mode, selectedProvider, selectedModelId, pipelineSteps, addToast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setTranscript(text);
        addToast({ type: 'success', message: `Loaded ${file.name}` });
      }
    };
    reader.readAsText(file);
  };

  // Parse assignment items for rendered view
  const assignmentItems = formattedAssignment ? parseAssignment(formattedAssignment) : [];
  const showAssignmentWorkspace = mode === 'assignment' && assignmentItems.length > 0 && !isGenerating;

  // Has content to show
  const hasOutput = !!streamingContent || isGenerating;

  return (
    <div className="flex h-full" style={{ paddingTop: '38px' }}>
      {/* Left panel — Configuration */}
      <div className="flex w-[380px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-card/30">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-lg font-bold text-foreground">Generate Content</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fill in details and hit ⌘Enter</p>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {/* Provider & Model selectors */}
          {availableProviders.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">No API keys configured</p>
              <p className="text-[11px] text-yellow-700 dark:text-yellow-400 mt-0.5">Go to Settings → API Keys to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isGenerating}
                >
                  {availableProviders.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isGenerating}
                >
                  {providerModels.map((m) => (
                    <option key={m.id} value={m.model_id}>
                      {m.display_name}{m.is_default === 1 ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Topic */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Introduction to React Hooks"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isGenerating}
            />
          </div>

          {/* Subtopics */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtopics</label>
            <textarea
              value={subtopics}
              onChange={(e) => setSubtopics(e.target.value)}
              placeholder="One subtopic per line:&#10;useState basics&#10;useEffect lifecycle&#10;Custom hooks"
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Mode selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Content Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  disabled={isGenerating}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                    mode === m.id
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-input bg-background hover:bg-muted/50'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-xs font-medium text-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Counts */}
          {mode === 'assignment' && (
            <div className="animate-fade-in">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Question Counts</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'mcsc' as const, label: 'MCSC', value: mcsc, set: setMcsc },
                  { key: 'mcmc' as const, label: 'MCMC', value: mcmc, set: setMcmc },
                  { key: 'subjective' as const, label: 'Subj.', value: subjective, set: setSubjective },
                ]).map((q) => (
                  <div key={q.key} className="rounded-lg border border-input bg-background p-2 text-center">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">{q.label}</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={q.value}
                      onChange={(e) => q.set(Math.max(0, Math.min(20, +e.target.value)))}
                      className="w-full text-center bg-transparent text-lg font-bold text-foreground focus:outline-none"
                      disabled={isGenerating}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transcript <span className="lowercase text-muted-foreground/60">(optional)</span>
              </label>
              <div className="flex items-center gap-1.5">
                {transcript && (
                  <span className="text-[10px] text-muted-foreground">
                    {transcript.trim().split(/\s+/).length} words
                  </span>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                  disabled={isGenerating}
                >
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.srt,.vtt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste or upload lecture transcript..."
              rows={5}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Generate / Abort buttons */}
          <div className="flex gap-2">
            {isGenerating ? (
              <button
                onClick={abortGeneration}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Generate
              </button>
            )}
          </div>

          {/* Quick actions after generation */}
          {hasOutput && !isGenerating && (
            <div className="flex gap-1.5 animate-fade-in">
              <button onClick={handleCopy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy
              </button>
              <button onClick={handleExportMarkdown} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button onClick={handleSaveToHistory} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </button>
              <button onClick={resetGeneration} className="flex items-center justify-center rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Reset">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3">
              <div className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Pipeline Stepper */}
          <PipelineStepper steps={pipelineSteps} isGenerating={isGenerating} />

          {/* Gap Analysis & Instructor Quality */}
          <GapAnalysisPanel />
        </div>
      </div>

      {/* Right panel — Output */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Assignment workspace toggle */}
        {showAssignmentWorkspace && (
          <div className="flex items-center gap-2 border-b border-border px-5 py-2 bg-card/50">
            <button
              onClick={() => setAssignmentView('rendered')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                assignmentView === 'rendered'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cards ({assignmentItems.length})
            </button>
            <button
              onClick={() => setAssignmentView('raw')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                assignmentView === 'raw'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Raw Markdown
            </button>
          </div>
        )}

        {showAssignmentWorkspace && assignmentView === 'rendered' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-8 py-6 grid gap-4">
              {assignmentItems.map((item, i) => (
                <AssignmentCard key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <StreamingView content={streamingContent} isGenerating={isGenerating} />
        )}
      </div>
    </div>
  );
}
