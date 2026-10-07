import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error?: Error;
}

/**
 * Minimal error boundary. Keeps a rendering failure inside one screen instead
 * of a blank page, and never reports the error anywhere.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local console only. No telemetry endpoint exists in this project.
    console.error('OpenAudioBooks render error', error, info);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <h1 className="page__title">Something went wrong</h1>
        <p className="notice notice--error">{error.message}</p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => this.setState({ error: undefined })}
        >
          Try again
        </button>
      </div>
    );
  }
}
