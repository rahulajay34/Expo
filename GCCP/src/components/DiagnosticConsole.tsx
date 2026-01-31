'use client';

import { useEffect, useState } from 'react';
import { X, Terminal } from 'lucide-react';

interface ConsoleLog {
  timestamp: number;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
}

export function DiagnosticConsole() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: ConsoleLog['type'], args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-49), {
        timestamp: Date.now(),
        type,
        message,
        data: args.length > 1 ? args.slice(1) : undefined,
      }]);
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      if (args[0]?.includes?.('[useGeneration]') || args[0]?.includes?.('[API')) {
        addLog('log', args);
      }
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      if (args[0]?.includes?.('[useGeneration]') || args[0]?.includes?.('[API')) {
        addLog('error', args);
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      if (args[0]?.includes?.('[useGeneration]') || args[0]?.includes?.('[API')) {
        addLog('warn', args);
      }
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      if (args[0]?.includes?.('[useGeneration]') || args[0]?.includes?.('[API')) {
        addLog('info', args);
      }
    };

    // Keyboard shortcut: Cmd/Ctrl + Shift + D
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        title="Open Diagnostic Console (Cmd/Ctrl + Shift + D)"
      >
        <Terminal className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[600px] max-h-[400px] bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold">Diagnostic Console</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No diagnostic logs yet. Click "Generate" to see logs.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className={`p-2 rounded ${
                log.type === 'error' ? 'bg-red-900/30 text-red-200' :
                log.type === 'warn' ? 'bg-yellow-900/30 text-yellow-200' :
                log.type === 'info' ? 'bg-blue-900/30 text-blue-200' :
                'bg-gray-800 text-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400 flex justify-between items-center">
        <span>{logs.length} log{logs.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setLogs([])}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
