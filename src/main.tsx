// ================================================
// FILE: src/main.tsx
// ================================================
import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from "./app/App.tsx";
import './styles/index.css'
import { UnitProvider } from './context/UnitContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Safely register Service Worker for PWA offline caching
try {
  import('virtual:pwa-register').then(({ registerSW }) => {
    if ('serviceWorker' in navigator) {
      registerSW({ immediate: true });
    }
  }).catch(() => {});
} catch (e) {}

// Establish global caching and retry strategies for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes default staleness
    },
  },
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught app error:", error, errorInfo);
  }

  handleReset = () => {
    if (window.confirm("This will clear all your saved trade data and reload the app. Are you sure you want to proceed?")) {
      localStorage.removeItem("astd_trade_storage"); 
      localStorage.removeItem("astd_cache_version"); 
      localStorage.removeItem("astd_give");          
      localStorage.removeItem("astd_get");            
      window.location.reload();
    }
  }

  handleSoftReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-screen h-screen bg-[#313338] text-[#F2F3F5] font-sans p-6 text-center">
          <h1 className="text-2xl font-bold text-[#ed4245] mb-2">Something went wrong.</h1>
          <p className="text-[#949BA4] mb-6 max-w-md">
            The application encountered an unexpected error. You can try a soft reload first. If this keeps happening, your saved trade data might be corrupted.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={this.handleSoftReload}
              className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] transition-colors rounded-[4px] font-medium"
            >
              Reload Page
            </button>
            <button 
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-[#da373c] hover:bg-[#a1282c] transition-colors rounded-[4px] font-medium"
            >
              Clear Data & Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnitProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </UnitProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)