'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display a fallback UI
 * Prevents the entire app from crashing on component errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-red-50 rounded-2xl border border-red-200 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-sm text-red-600 mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again or return to the home page.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-105"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
            >
              <Home size={16} />
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

