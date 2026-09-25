import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GranularErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[Granular Boundary Caught] ${this.props.fallbackName || "Component"}:`,
      error,
      errorInfo
    );
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-card/50 border border-destructive/20 rounded-[8px] text-center w-full h-full min-h-[250px] animate-fade-in">
          <AlertTriangle className="w-10 h-10 text-destructive mb-4 opacity-80" />
          <h3 className="text-foreground font-black text-[16px] mb-2 uppercase tracking-wide">
            {this.props.fallbackName || "Component"} Failed
          </h3>
          <p className="text-muted-foreground text-[13px] mb-6 max-w-sm leading-relaxed">
            {this.state.error?.message ||
              "An unexpected rendering error occurred. Our monitoring systems have logged the fault."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-card border border-border hover:border-muted-foreground text-foreground rounded-[4px] text-[12px] font-bold transition-all focus-visible:outline-none cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Attempt Recovery
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
