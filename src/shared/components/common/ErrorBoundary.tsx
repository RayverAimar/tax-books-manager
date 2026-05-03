import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error logged in state
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold">Algo salió mal</h1>

            <p className="text-muted-foreground">
              La aplicación encontró un error inesperado. Puedes intentar recargar la página o volver a intentarlo.
            </p>

            {this.state.error && (
              <div className="rounded-md bg-muted p-4 text-left">
                <p className="break-words font-mono text-sm text-destructive">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <Button onClick={this.handleReset} variant="outline">
                Intentar de nuevo
              </Button>
              <Button onClick={this.handleReload}>Recargar página</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
