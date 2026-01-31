/**
 * Logging utility for GCCP agent pipeline
 * Provides structured logging with levels, timestamps, and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    agent?: string;
    action?: string;
    message: string;
    data?: any;
    duration?: number;
    cost?: number;
    removedCount?: number;
    replacedCount?: number;
}

// In-memory log storage (could be extended to persist)
const logs: LogEntry[] = [];
const MAX_LOGS = 500;

// Current log level (only logs at this level or higher will be recorded)
let currentLevel: LogLevel = 'info';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
    currentLevel = level;
}

/**
 * Create a log entry
 */
function log(level: LogLevel, message: string, context?: { agent?: string; action?: string; data?: any; duration?: number; cost?: number; removedCount?: number; replacedCount?: number }): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) {
        return;
    }

    const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        message,
        ...context
    };

    logs.push(entry);

    // Trim old logs
    if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
    }

    // Console output with formatting
    const prefix = context?.agent ? `[${context.agent}]` : '';
    const suffix = context?.duration ? ` (${context.duration}ms)` : '';
    const costSuffix = context?.cost ? ` Cost: $${context.cost.toFixed(4)}` : '';

    switch (level) {
        case 'debug':
            console.debug(`🔍 ${prefix} ${message}${suffix}${costSuffix}`, context?.data || '');
            break;
        case 'info':
            console.info(`ℹ️ ${prefix} ${message}${suffix}${costSuffix}`, context?.data || '');
            break;
        case 'warn':
            console.warn(`⚠️ ${prefix} ${message}${suffix}${costSuffix}`, context?.data || '');
            break;
        case 'error':
            console.error(`❌ ${prefix} ${message}${suffix}${costSuffix}`, context?.data || '');
            break;
    }
}

/**
 * Convenience methods
 */
    debug: (message: string, context?: { agent?: string; action?: string; data?: any; duration?: number; cost?: number; removedCount?: number; replacedCount?: number }) =>
        log('debug', message, context),

    info: (message: string, context?: { agent?: string; action?: string; data?: any; duration?: number; cost?: number; removedCount?: number; replacedCount?: number }) =>
        log('info', message, context),

    warn: (message: string, context?: { agent?: string; action?: string; data?: any; duration?: number; cost?: number; removedCount?: number; replacedCount?: number }) =>
        log('warn', message, context),

    error: (message: string, context?: { agent?: string; action?: string; data?: any; duration?: number; cost?: number; removedCount?: number; replacedCount?: number }) =>
        log('error', message, context),

    /**
     * Time an async operation
     */
    async time<T>(name: string, fn: () => Promise<T>, context?: { agent?: string }): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = Math.round(performance.now() - start);
            log('info', `${name} completed`, { ...context, duration });
            return result;
        } catch (err: any) {
            const duration = Math.round(performance.now() - start);
            log('error', `${name} failed: ${err.message}`, { ...context, duration, data: err });
            throw err;
        }
    },

    /**
     * Get all logs
     */
    getLogs: (): LogEntry[] => [...logs],

    /**
     * Get logs for a specific agent
     */
    getAgentLogs: (agent: string): LogEntry[] =>
        logs.filter(l => l.agent === agent),

    /**
     * Clear all logs
     */
    clear: (): void => {
        logs.length = 0;
    },

    /**
     * Export logs as JSON
     */
    export: (): string => JSON.stringify(logs, null, 2),

    /**
     * Get performance metrics
     */
    getMetrics: () => {
        const agentLogs = logs.filter(l => l.agent && l.duration);
        const byAgent: Record<string, { count: number; totalTime: number; avgTime: number; totalCost: number; avgCost: number }> = {};

        for (const log of agentLogs) {
            if (!log.agent) continue;
            if (!byAgent[log.agent]) {
                byAgent[log.agent] = { count: 0, totalTime: 0, avgTime: 0, totalCost: 0, avgCost: 0 };
            }
            byAgent[log.agent].count++;
            byAgent[log.agent].totalTime += log.duration || 0;
            byAgent[log.agent].totalCost += log.cost || 0;
        }

        // Calculate averages
        for (const agent in byAgent) {
            byAgent[agent].avgTime = byAgent[agent].totalTime / byAgent[agent].count;
            byAgent[agent].avgCost = byAgent[agent].totalCost / byAgent[agent].count;
        }

        return byAgent;
    }
};
