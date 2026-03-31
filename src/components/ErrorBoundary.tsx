'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Short label shown in the default fallback heading, e.g. "Preview failed to render" */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    const { label = 'Something went wrong', error } = {
      label: this.props.label ?? 'Something went wrong',
      error: this.state.error,
    };

    return (
      <div
        role="alert"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '24px',
          margin: '16px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {label}
          </span>
        </div>

        {error && (
          <details
            style={{
              marginBottom: '16px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                marginBottom: '6px',
                color: 'var(--text-secondary)',
              }}
            >
              Error details
            </summary>
            <pre
              style={{
                background: 'var(--sidebar)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '10px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '11px',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              {error.message}
            </pre>
          </details>
        )}

        <button
          onClick={this.handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--background)';
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
