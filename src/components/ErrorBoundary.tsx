import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message || "An unexpected error occurred.";
      const isVersionError = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(errorMessage);

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{isVersionError ? 'A newer version is available' : 'Something went wrong'}</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {isVersionError
                ? 'A required application file could not be loaded. When your connection is available, reload to get the current version. If you were taking an exam, resume your existing session; do not start a new exam.'
                : errorMessage}
            </p>

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleReset} className="w-full gap-2 bg-indigo-600">
                <RefreshCcw size={18} /> {isVersionError ? 'Reload current version' : 'Try Again'}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/"} className="w-full gap-2">
                <Home size={18} /> Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
