'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Trash2,
  Key,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Cpu,
  Zap,
  Code2,
  Globe,
  Layers,
  Sparkles,
  Server,
  HardDrive,
  Activity,
  Bell,
  BellOff,
  Palette,
  Check,
} from 'lucide-react';

import { useGenerations } from '@/lib/hooks/use-generations';
import { useAppStore } from '@/lib/store';
import { APP_NAME, APP_VERSION, APP_DESCRIPTION } from '@/lib/constants';
import {
  getNotificationPreference,
  setNotificationPreference,
  getPermissionStatus,
  requestPermission,
} from '@/lib/hooks/use-notifications';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  }),
};

const sectionHover = {
  y: -2,
  transition: { duration: 0.2, ease: 'easeOut' as const },
};

// ---------------------------------------------------------------------------
// Supported models (display-only list for API Config)
// ---------------------------------------------------------------------------

const SUPPORTED_MODELS = [
  {
    name: 'gemini-2.5-pro',
    description: 'Most capable model for complex tasks',
    icon: Cpu,
    badge: 'Pro',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  },
  {
    name: 'gemini-2.5-flash',
    description: 'Fast and efficient for everyday use',
    icon: Zap,
    badge: 'Flash',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
];

// ---------------------------------------------------------------------------
// Model selector options
// ---------------------------------------------------------------------------

const MODEL_OPTIONS = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast and cost-efficient. Best for most use cases.',
    cost: '~$0.002',
    icon: Zap,
    badge: 'Flash',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Higher quality output with more nuanced content.',
    cost: '~$0.01',
    icon: Cpu,
    badge: 'Pro',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  },
];

// ---------------------------------------------------------------------------
// Accent color options
// ---------------------------------------------------------------------------

type AccentColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';

const ACCENT_COLORS: { value: AccentColor; label: string; lightColor: string; darkColor: string }[] = [
  { value: 'indigo', label: 'Indigo', lightColor: 'bg-indigo-500', darkColor: 'bg-indigo-400' },
  { value: 'blue', label: 'Blue', lightColor: 'bg-blue-500', darkColor: 'bg-blue-400' },
  { value: 'emerald', label: 'Emerald', lightColor: 'bg-emerald-500', darkColor: 'bg-emerald-400' },
  { value: 'rose', label: 'Rose', lightColor: 'bg-rose-500', darkColor: 'bg-rose-400' },
  { value: 'amber', label: 'Amber', lightColor: 'bg-amber-500', darkColor: 'bg-amber-400' },
];

// ---------------------------------------------------------------------------
// Tech stack items
// ---------------------------------------------------------------------------

const techStack = [
  { name: 'Next.js 16', description: 'App Router', icon: Globe },
  { name: 'Tailwind CSS v4', description: 'Styling', icon: Layers },
  { name: 'shadcn/ui', description: 'Component library', icon: Code2 },
  { name: 'Framer Motion', description: 'Animations', icon: Sparkles },
  { name: 'Zustand', description: 'State management', icon: Activity },
  { name: 'Dexie.js', description: 'IndexedDB wrapper', icon: HardDrive },
  { name: 'Google Gemini', description: 'AI backbone', icon: Cpu },
];

// ---------------------------------------------------------------------------
// Storage Section
// ---------------------------------------------------------------------------

function StorageSection({
  count,
  clearAll,
  sessionTopic,
  sessionContentType,
  sessionGenerationId,
}: {
  count: number;
  clearAll: () => Promise<void>;
  sessionTopic: string;
  sessionContentType: string;
  sessionGenerationId: number | null;
}) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearAll();
    } finally {
      setIsClearing(false);
    }
  };

  const capacityPercent = Math.min((count / 50) * 100, 100);

  return (
    <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                Manage your locally stored generations
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Storage metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Stored Generations
              </p>
              <p className="mt-1 text-2xl font-bold">{count}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                of 50 maximum
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Storage Capacity
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{capacityPercent.toFixed(0)}%</span>
                  <span className="text-muted-foreground">{count}/50</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${capacityPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      capacityPercent > 80
                        ? 'bg-amber-500'
                        : capacityPercent > 95
                          ? 'bg-destructive'
                          : 'bg-primary'
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Storage Engine
              </p>
              <p className="mt-1 text-lg font-semibold">IndexedDB</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                via Dexie.js
              </p>
            </div>
          </div>

          <Separator />

          {/* Current session state */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-muted-foreground" />
              Current Session State
            </h4>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Active Topic
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">
                    {sessionTopic || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Content Type
                  </p>
                  <p className="mt-0.5 text-sm font-medium capitalize">
                    {sessionContentType?.replace('-', ' ') || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Generation ID
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {sessionGenerationId !== null
                      ? `#${sessionGenerationId}`
                      : 'Unsaved'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Clear all button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={count === 0 || isClearing}
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all saved generations, settings,
                  and cached data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleClear}
                >
                  Clear Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AI Model Section
// ---------------------------------------------------------------------------

function AIModelSection() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  return (
    <motion.div custom={0.5} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Cpu className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle>AI Model</CardTitle>
              <CardDescription>
                Choose which Gemini model to use for content generation
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <RadioGroup
            value={selectedModel}
            onValueChange={setSelectedModel}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {MODEL_OPTIONS.map((model) => {
              const isSelected = selectedModel === model.value;
              return (
                <Label
                  key={model.value}
                  htmlFor={`model-${model.value}`}
                  className={`relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <RadioGroupItem
                    value={model.value}
                    id={`model-${model.value}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <model.icon className="h-4 w-4 text-foreground/70" />
                      <span className="text-sm font-semibold">{model.label}</span>
                      <Badge className={`border-0 text-[10px] ${model.badgeColor}`}>
                        {model.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {model.description}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      Est. cost per generation:{' '}
                      <span className="text-foreground">{model.cost}</span>
                    </p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>

          <p className="text-xs text-muted-foreground">
            Your model preference is saved locally and used for all future generations.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Appearance Section (Accent Color)
// ---------------------------------------------------------------------------

function AppearanceSection() {
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);

  return (
    <motion.div custom={0.75} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
              <Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the accent color theme of the application
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Accent Color</h4>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setAccentColor(color.value)}
                    className="group flex flex-col items-center gap-1.5"
                    aria-label={`Set accent color to ${color.label}`}
                  >
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full ${color.lightColor} dark:${color.darkColor} transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
                          : 'group-hover:scale-105 group-hover:ring-1 group-hover:ring-offset-1 group-hover:ring-offset-background group-hover:ring-muted-foreground/50'
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <span className={`text-xs ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {color.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Changes the primary, ring, and accent colors throughout the app. Theme preference is saved locally.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Language & Content Defaults Section
// ---------------------------------------------------------------------------

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English', description: 'Default language' },
  { value: 'Hindi', label: 'Hindi', description: 'Devanagari script' },
  { value: 'Hinglish', label: 'Hinglish', description: 'Hindi + English mix' },
] as const;

const CONTENT_LENGTH_OPTIONS = [
  { value: 'brief' as const, label: 'Brief', description: '~1,500 words — essentials only' },
  { value: 'standard' as const, label: 'Standard', description: '~2,500 words — balanced coverage' },
  { value: 'detailed' as const, label: 'Detailed', description: '~4,000 words — in-depth with examples' },
  { value: 'comprehensive' as const, label: 'Comprehensive', description: '~6,000 words — exhaustive' },
] as const;

function LanguageAndDefaultsSection() {
  const outputLanguage = useAppStore((s) => s.outputLanguage);
  const setOutputLanguage = useAppStore((s) => s.setOutputLanguage);
  const customLanguages = useAppStore((s) => s.customLanguages);
  const addCustomLanguage = useAppStore((s) => s.addCustomLanguage);
  const contentLength = useAppStore((s) => s.contentLength);
  const setContentLength = useAppStore((s) => s.setContentLength);
  const [customLangInput, setCustomLangInput] = useState('');

  const handleAddCustomLanguage = () => {
    const trimmed = customLangInput.trim();
    if (trimmed && !customLanguages.includes(trimmed)) {
      addCustomLanguage(trimmed);
      setOutputLanguage(trimmed);
      setCustomLangInput('');
    }
  };

  const allLanguages = [...LANGUAGE_OPTIONS, ...customLanguages.map((l) => ({ value: l, label: l, description: 'Custom' }))];
  const isCustomSelected = !['English', 'Hindi', 'Hinglish'].includes(outputLanguage) && !customLanguages.includes(outputLanguage);

  return (
    <motion.div custom={0.85} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <CardTitle>Language & Content Defaults</CardTitle>
              <CardDescription>
                Set default output language and content length preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Output Language */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Output Language</h4>
            <RadioGroup
              value={outputLanguage}
              onValueChange={setOutputLanguage}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {allLanguages.map((lang) => {
                const isSelected = outputLanguage === lang.value;
                return (
                  <Label
                    key={lang.value}
                    htmlFor={`lang-${lang.value}`}
                    className={`relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <RadioGroupItem
                      value={lang.value}
                      id={`lang-${lang.value}`}
                    />
                    <div>
                      <span className="text-sm font-medium">{lang.label}</span>
                      <p className="text-[11px] text-muted-foreground">{lang.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>

            {/* Add custom language */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customLangInput}
                onChange={(e) => setCustomLangInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomLanguage()}
                placeholder="Add custom language..."
                className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCustomLanguage}
                disabled={!customLangInput.trim()}
                className="h-8 text-xs"
              >
                Add
              </Button>
            </div>
            {isCustomSelected && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Current language &ldquo;{outputLanguage}&rdquo; is not in your list. Select one above or add it as custom.
              </p>
            )}
          </div>

          <Separator />

          {/* Default Content Length */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Default Content Length</h4>
            <RadioGroup
              value={contentLength}
              onValueChange={(v) => setContentLength(v as 'brief' | 'standard' | 'detailed' | 'comprehensive')}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {CONTENT_LENGTH_OPTIONS.map((opt) => {
                const isSelected = contentLength === opt.value;
                return (
                  <Label
                    key={opt.value}
                    htmlFor={`length-${opt.value}`}
                    className={`relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`length-${opt.value}`}
                    />
                    <div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground">
            These preferences are saved locally and apply to all future generations. You can also change them per-generation in the editor.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// API Configuration Section
// ---------------------------------------------------------------------------

function ApiConfigSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const checkApiHealth = useCallback(async () => {
    setApiStatus('checking');
    try {
      const response = await fetch('/api/health', { method: 'GET' });
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch {
      setApiStatus('error');
    }
  }, []);

  useEffect(() => {
    void checkApiHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  API Configuration
                  {apiStatus === 'connected' && (
                    <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  {apiStatus === 'error' && (
                    <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                  {apiStatus === 'checking' && (
                    <Badge variant="secondary" className="border-0">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Checking
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Server-side environment variable configuration
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-6">
              {/* Info banner */}
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-200">
                    Server-side configuration
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    The Gemini API key is configured as a server-side environment
                    variable. It is never exposed to the browser. Set the{' '}
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900">
                      GEMINI_API_KEY
                    </code>{' '}
                    variable in your{' '}
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900">
                      .env.local
                    </code>{' '}
                    file to enable generation.
                  </p>
                </div>
              </div>

              {/* .env.local example */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Environment Setup
                </h4>
                <div className="overflow-hidden rounded-lg border bg-zinc-950 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                    <span className="text-xs font-medium text-zinc-400">
                      .env.local
                    </span>
                    <Badge variant="secondary" className="border-0 text-[10px]">
                      Server only
                    </Badge>
                  </div>
                  <pre className="p-4 text-sm">
                    <code className="text-emerald-400">
                      {`# Google Gemini API Key\nGEMINI_API_KEY=your_api_key_here`}
                    </code>
                  </pre>
                </div>
              </div>

              <Separator />

              {/* Supported models */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Supported Models</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUPPORTED_MODELS.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <model.icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold font-mono">
                            {model.name}
                          </p>
                          <Badge className={`border-0 text-[10px] ${model.badgeColor}`}>
                            {model.badge}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retry status check */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkApiHealth}
                  className="gap-2"
                >
                  {apiStatus === 'checking' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" />
                  )}
                  Check Connection
                </Button>
                <span className="text-xs text-muted-foreground">
                  Pings{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                    /api/health
                  </code>{' '}
                  endpoint
                </span>
              </div>
            </CardContent>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Notifications Section
// ---------------------------------------------------------------------------

function NotificationsSection() {
  const [enabled, setEnabled] = useState(() => getNotificationPreference());
  const [permissionStatus, setPermissionStatus] = useState<
    NotificationPermission | 'unsupported'
  >(() => getPermissionStatus());

  const handleToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      // When enabling, request permission first
      const result = await requestPermission();
      setPermissionStatus(result);
      if (result === 'granted') {
        setNotificationPreference(true);
        setEnabled(true);
      } else {
        // Permission denied or unsupported — keep toggle off
        setNotificationPreference(false);
        setEnabled(false);
      }
    } else {
      setNotificationPreference(false);
      setEnabled(false);
    }
  }, []);

  const permissionBadge = (() => {
    switch (permissionStatus) {
      case 'granted':
        return (
          <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Granted
          </Badge>
        );
      case 'denied':
        return (
          <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            <XCircle className="mr-1 h-3 w-3" />
            Denied
          </Badge>
        );
      case 'unsupported':
        return (
          <Badge variant="secondary" className="border-0">
            <BellOff className="mr-1 h-3 w-3" />
            Unsupported
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="border-0">
            <Bell className="mr-1 h-3 w-3" />
            Not Asked
          </Badge>
        );
    }
  })();

  return (
    <motion.div custom={1.5} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <Bell className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Desktop notifications for generation status
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label htmlFor="notification-toggle" className="cursor-pointer">
                Enable desktop notifications
              </Label>
            </div>
            <Switch
              id="notification-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={permissionStatus === 'unsupported'}
            />
          </div>

          <Separator />

          {/* Permission status */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Browser permission status
            </p>
            {permissionBadge}
          </div>

          {permissionStatus === 'denied' && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Notification permission was denied. To re-enable, click the
                lock/info icon in your browser&apos;s address bar and allow
                notifications for this site, then reload the page.
              </p>
            </div>
          )}

          {/* What notifications do */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <h4 className="mb-2 text-sm font-medium">When enabled, you will receive:</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Notification when content generation completes
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                Notification if generation encounters an error
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// About Section
// ---------------------------------------------------------------------------

function AboutSection() {
  return (
    <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible" whileHover={sectionHover}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Info className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Application information and credits
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* App info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <span className="text-xl font-bold text-primary-foreground">G</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {APP_NAME}
                <Badge variant="secondary" className="ml-2 border-0 text-[10px] align-middle">
                  v{APP_VERSION}
                </Badge>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {APP_DESCRIPTION}
              </p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                An AI-powered platform that generates high-quality, curriculum-ready educational
                materials using a 7-agent pipeline. Content that would take hours is generated
                in roughly 90 seconds with multiple AI review stages.
              </p>
            </div>
          </div>

          <Separator />

          {/* Tech stack */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Technology Stack</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <tech.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{tech.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tech.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Key features */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Key Features</h4>
            <div className="flex flex-wrap gap-2">
              {[
                '7-Agent Pipeline',
                'Real-time Streaming',
                '3 Content Types',
                'Quality Assured',
                'Local-first Storage',
                'Gap Analysis',
                'Export Options',
                'Dark Mode',
              ].map((feature) => (
                <Badge
                  key={feature}
                  variant="outline"
                  className="text-xs"
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            <Badge
              className="cursor-pointer border-0 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Documentation
            </Badge>
            <Badge
              className="cursor-pointer border-0 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Code2 className="mr-1.5 h-3 w-3" />
              Source Code
            </Badge>
            <Badge
              className="cursor-pointer border-0 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Globe className="mr-1.5 h-3 w-3" />
              Website
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page Skeleton — shown during hydration
// ---------------------------------------------------------------------------

function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Storage section skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <Skeleton className="h-9 w-36 rounded-md" />
        </CardContent>
      </Card>

      {/* AI Model section skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Configuration section skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </CardHeader>
      </Card>

      {/* About section skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-full max-w-lg" />
              <Skeleton className="h-4 w-[80%] max-w-lg" />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Content
// ---------------------------------------------------------------------------

export function SettingsContent() {
  const { count, clearAll } = useGenerations();
  const topic = useAppStore((s) => s.topic);
  const contentType = useAppStore((s) => s.contentType);
  const activeGenerationId = useAppStore((s) => s.activeGenerationId);

  // Hydration guard — show skeleton on server / first client render
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!hydrated) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* --------------------------------------------------------------- */}
      {/* Page Header                                                      */}
      {/* --------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage storage, AI model, appearance, and app information
            </p>
          </div>
        </div>
      </motion.div>

      {/* --------------------------------------------------------------- */}
      {/* Sections                                                         */}
      {/* --------------------------------------------------------------- */}
      <StorageSection
        count={count}
        clearAll={clearAll}
        sessionTopic={topic}
        sessionContentType={contentType}
        sessionGenerationId={activeGenerationId}
      />

      <AIModelSection />

      <AppearanceSection />

      <LanguageAndDefaultsSection />

      <ApiConfigSection />

      <NotificationsSection />

      <AboutSection />

      {/* --------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* --------------------------------------------------------------- */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground/50"
      >
        {APP_NAME} v{APP_VERSION} &mdash; All data is stored locally on your device.
      </motion.p>
    </div>
  );
}
