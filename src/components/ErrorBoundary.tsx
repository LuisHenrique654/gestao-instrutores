import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends (React.Component as any) {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          errorMessage = `Erro no Firestore: ${parsedError.error} (${parsedError.operationType} em ${parsedError.path})`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-[2.5rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
              <AlertCircle className="text-rose-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase">Ops! Algo deu errado</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full btn-corporate-primary flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
