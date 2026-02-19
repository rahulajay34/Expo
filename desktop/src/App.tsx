import { useEffect, useState, useCallback } from 'react';
import { useStore } from './store';
import { initDatabase } from './lib/database';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { PromptsPage } from './pages/PromptsPage';
import { HistoryPage } from './pages/HistoryPage';

function PageRouter() {
  const currentPage = useStore((s) => s.currentPage);

  switch (currentPage) {
    case 'editor':
      return <EditorPage />;
    case 'settings':
      return <SettingsPage />;
    case 'prompts':
      return <PromptsPage />;
    case 'history':
      return <HistoryPage />;
    default:
      return <EditorPage />;
  }
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const setTheme = useStore((s) => s.setTheme);
  const navigate = useStore((s) => s.navigate);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to initialize database';
        console.error('Database initialization failed:', e);
        setDbError(msg);
      }
    }
    init();

    // Restore theme
    const saved = localStorage.getItem('gccp-theme') as 'light' | 'dark' | 'system' | null;
    if (saved) setTheme(saved);
  }, []);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;

    // ⌘1-4: Navigate pages
    if (meta && e.key === '1') { e.preventDefault(); navigate('editor'); return; }
    if (meta && e.key === '2') { e.preventDefault(); navigate('history'); return; }
    if (meta && e.key === '3') { e.preventDefault(); navigate('prompts'); return; }
    if (meta && e.key === '4') { e.preventDefault(); navigate('settings'); return; }

    // ⌘,: Settings
    if (meta && e.key === ',') { e.preventDefault(); navigate('settings'); return; }

    // ⌘[: Toggle sidebar
    if (meta && e.key === '[') { e.preventDefault(); toggleSidebar(); return; }
  }, [navigate, toggleSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (dbError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Database Error</h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <PageRouter />
      </main>
      <ToastContainer />
    </div>
  );
}
