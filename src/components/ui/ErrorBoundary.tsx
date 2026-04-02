import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">
                {this.props.fallbackTitle || "Er ging iets mis"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact op met support als het probleem aanhoudt.
              </p>
            </div>
            <Button onClick={this.handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Opnieuw proberen
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
