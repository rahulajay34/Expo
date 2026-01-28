'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger, LogEntry } from '@/lib/utils/logger';
import { BarChart, Clock, Database, AlertCircle, X, RefreshCw } from 'lucide-react';

export function MetricsDashboard({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Record<string, { count: number; totalTime: number; avgTime: number; totalCost: number; avgCost: number }>>({});
  const [activeTab, setActiveTab] = useState<'metrics' | 'logs'>('metrics');

  const refreshData = useCallback(() => {
    // Create a copy before reversing to avoid mutating the global log array
    setLogs([...logger.getLogs()].reverse()); 
    setMetrics(logger.getMetrics());
  }, []);

  useEffect(() => {
    refreshData();
    // Auto-refresh every 2 seconds while open
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const totalDuration = Object.values(metrics).reduce((sum, m) => sum + m.totalTime, 0);
  const totalCost = Object.values(metrics).reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <BarChart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Performance Telemetry</h2>
              <p className="text-xs text-gray-500 font-medium">Real-time agent pipeline metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={refreshData}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
           <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'metrics' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Agent Metrics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            System Logs
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30">
          
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <Clock size={12} /> Total Pipeline Time
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{(totalDuration / 1000).toFixed(2)}s</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <Database size={12} /> Active Agents
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{Object.keys(metrics).length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle size={12} /> Total Cost
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</div>
                </div>
              </div>

              {/* Agent Breakdown Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-700 text-sm">Agent Breakdown</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3">Agent</th>
                      <th className="px-5 py-3 text-right">Calls</th>
                      <th className="px-5 py-3 text-right">Avg Duration</th>
                      <th className="px-5 py-3 text-right">Total Duration</th>
                      <th className="px-5 py-3 text-right">Avg Cost</th>
                      <th className="px-5 py-3 text-right">Total Cost</th>
                      <th className="px-5 py-3 w-32">Time Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(metrics).map(([agent, data]) => {
                      const share = totalDuration > 0 ? (data.totalTime / totalDuration) * 100 : 0;
                      return (
                        <tr key={agent} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{agent}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{data.count}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{(data.avgTime / 1000).toFixed(2)}s</td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">{(data.totalTime / 1000).toFixed(2)}s</td>
                          <td className="px-5 py-3 text-right text-gray-600">${(data.avgCost || 0).toFixed(4)}</td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">${(data.totalCost || 0).toFixed(4)}</td>
                          <td className="px-5 py-3">
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.max(share, 5)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {Object.keys(metrics).length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                          No performance data recorded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-xl overflow-x-auto shadow-inner min-h-[400px]">
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic text-center py-10">No logs available</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1 border-l-2 border-transparent hover:border-green-600 hover:bg-green-900/10 pl-2 py-0.5 transition-colors">
                      <span className="text-gray-500 select-none mr-2">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`uppercase font-bold mr-2 ${
                        log.level === 'error' ? 'text-red-500' :
                        log.level === 'warn' ? 'text-yellow-500' :
                        log.level === 'debug' ? 'text-blue-500' : 'text-green-500'
                      }`}>
                        [{log.level}]
                      </span>
                      {log.agent && (
                        <span className="text-purple-400 font-bold mr-2">
                          @{log.agent}
                        </span>
                      )}
                      <span className="text-gray-300">{log.message}</span>
                      {log.duration && (
                        <span className="text-yellow-400 ml-2">
                          ({log.duration}ms)
                        </span>
                      )}
                      {log.data && (
                        <div className="ml-8 mt-1 text-gray-500 whitespace-pre-wrap">
                           {JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
