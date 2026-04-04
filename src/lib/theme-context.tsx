'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

export type AccentColorId = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal' | 'red' | 'indigo';

export interface AccentPreset {
  id: AccentColorId;
  label: string;
  light: string;
  lightRgb: string;
  dark: string;
  darkRgb: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'blue',   label: 'Blue',   light: '#2383E2', lightRgb: '35,131,226',  dark: '#6BA3E8', darkRgb: '107,163,232' },
  { id: 'purple', label: 'Purple', light: '#7C3AED', lightRgb: '124,58,237',  dark: '#A78BFA', darkRgb: '167,139,250' },
  { id: 'green',  label: 'Green',  light: '#059669', lightRgb: '5,150,105',   dark: '#34D399', darkRgb: '52,211,153' },
  { id: 'orange', label: 'Orange', light: '#D97706', lightRgb: '217,119,6',   dark: '#FBBF24', darkRgb: '251,191,36' },
  { id: 'pink',   label: 'Pink',   light: '#DB2777', lightRgb: '219,39,119',  dark: '#F472B6', darkRgb: '244,114,182' },
  { id: 'teal',   label: 'Teal',   light: '#0D9488', lightRgb: '13,148,136',  dark: '#2DD4BF', darkRgb: '45,212,191' },
  { id: 'red',    label: 'Red',    light: '#DC2626', lightRgb: '220,38,38',   dark: '#F87171', darkRgb: '248,113,113' },
  { id: 'indigo', label: 'Indigo', light: '#4F46E5', lightRgb: '79,70,229',   dark: '#818CF8', darkRgb: '129,140,248' },
];

export type FontFamilyId = 'plus-jakarta' | 'inter' | 'source-sans' | 'nunito' | 'rubik' | 'space-grotesk' | 'dm-sans' | 'outfit' | 'raleway' | 'lora';

export interface FontOption {
  id: FontFamilyId;
  label: string;
  family: string;
  googleFamily: string; // URL-encoded for Google Fonts
  isDefault?: boolean;
  isSerif?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'plus-jakarta',  label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans'", googleFamily: 'Plus+Jakarta+Sans', isDefault: true },
  { id: 'inter',         label: 'Inter',             family: "'Inter'",             googleFamily: 'Inter' },
  { id: 'source-sans',   label: 'Source Sans 3',     family: "'Source Sans 3'",     googleFamily: 'Source+Sans+3' },
  { id: 'nunito',        label: 'Nunito',            family: "'Nunito'",            googleFamily: 'Nunito' },
  { id: 'rubik',         label: 'Rubik',             family: "'Rubik'",             googleFamily: 'Rubik' },
  { id: 'space-grotesk', label: 'Space Grotesk',     family: "'Space Grotesk'",     googleFamily: 'Space+Grotesk' },
  { id: 'dm-sans',       label: 'DM Sans',           family: "'DM Sans'",           googleFamily: 'DM+Sans' },
  { id: 'outfit',        label: 'Outfit',            family: "'Outfit'",            googleFamily: 'Outfit' },
  { id: 'raleway',       label: 'Raleway',           family: "'Raleway'",           googleFamily: 'Raleway' },
  { id: 'lora',          label: 'Lora',              family: "'Lora'",              googleFamily: 'Lora', isSerif: true },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  accentColor: AccentColorId;
  setAccentColor: (id: AccentColorId) => void;
  fontFamily: FontFamilyId;
  setFontFamily: (id: FontFamilyId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyAccent(presetId: AccentColorId, dark: boolean) {
  const preset = ACCENT_PRESETS.find(p => p.id === presetId) ?? ACCENT_PRESETS[0];
  const el = document.documentElement;
  el.style.setProperty('--accent', dark ? preset.dark : preset.light);
  el.style.setProperty('--accent-rgb', dark ? preset.darkRgb : preset.lightRgb);
}

function loadGoogleFont(fontId: FontFamilyId) {
  const opt = FONT_OPTIONS.find(f => f.id === fontId);
  if (!opt || opt.isDefault) return; // Plus Jakarta already loaded via next/font
  const linkId = `google-font-${fontId}`;
  if (document.getElementById(linkId)) return; // already injected
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${opt.googleFamily}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function applyFont(fontId: FontFamilyId) {
  const opt = FONT_OPTIONS.find(f => f.id === fontId) ?? FONT_OPTIONS[0];
  loadGoogleFont(fontId);
  const fallback = "var(--font-plus-jakarta), system-ui, sans-serif";
  const value = opt.isDefault ? fallback : `${opt.family}, ${fallback}`;
  document.documentElement.style.setProperty('--font-custom', value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentState] = useState<AccentColorId>('blue');
  const [fontFamily, setFontState] = useState<FontFamilyId>('plus-jakarta');

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('news13n_theme') as Theme | null;
    const initial: Theme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
    setThemeState(initial);
    const dark = resolveIsDark(initial);
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Accent
    const savedAccent = localStorage.getItem('news13n_accent') as AccentColorId | null;
    const accentId = savedAccent && ACCENT_PRESETS.some(p => p.id === savedAccent) ? savedAccent : 'blue';
    setAccentState(accentId);
    applyAccent(accentId, dark);

    // Font
    const savedFont = localStorage.getItem('news13n_font') as FontFamilyId | null;
    const fontId = savedFont && FONT_OPTIONS.some(f => f.id === savedFont) ? savedFont : 'plus-jakarta';
    setFontState(fontId);
    applyFont(fontId);
  }, []);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Re-apply accent for new dark/light variant
      applyAccent(accentColor, e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, accentColor]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('news13n_theme', newTheme);
    const dark = resolveIsDark(newTheme);
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Re-apply accent for new mode
    const savedAccent = localStorage.getItem('news13n_accent') as AccentColorId | null;
    applyAccent(savedAccent ?? 'blue', dark);
  }, []);

  const setAccentColor = useCallback((id: AccentColorId) => {
    setAccentState(id);
    localStorage.setItem('news13n_accent', id);
    applyAccent(id, resolveIsDark(theme));
  }, [theme]);

  const setFontFamily = useCallback((id: FontFamilyId) => {
    setFontState(id);
    localStorage.setItem('news13n_font', id);
    applyFont(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, accentColor, setAccentColor, fontFamily, setFontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
