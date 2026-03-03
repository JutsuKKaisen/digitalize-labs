"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component.
 * Wraps components that may crash (e.g., 3D Graph, Viewer)
 * to prevent a single component failure from taking down the entire app.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-card border border-border rounded-xl p-8 gap-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.props.fallbackMessage ||
              "This component encountered an error and couldn't render. Your other features are unaffected."}
          </p>
          {this.state.error && (
            <details className="text-xs text-muted-foreground bg-muted p-3 rounded-lg border border-border max-w-md w-full">
              <summary className="cursor-pointer font-semibold">
                Technical Details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
