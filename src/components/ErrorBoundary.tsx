import { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION } from '../version';
import { resolveUiLocale, translate } from '../i18n';

interface State {
  error?: Error;
}

/**
 * Minimal error boundary. Keeps a rendering failure inside one screen instead
 * of a blank page, and never reports the error anywhere.
 *
 * Reads the locale from localStorage directly rather than using React context,
 * because this boundary wraps I18nProvider and may render when context is
 * unavailable.
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

  private getLocale(): string {
    try {
      const stored = localStorage.getItem('openaudiobooks.preferences.v1');
      if (stored) {
        const parsed = JSON.parse(stored) as { uiLocale?: string };
        if (parsed.uiLocale) return resolveUiLocale(parsed.uiLocale);
      }
    } catch {
      // fall through
    }
    return 'ru';
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const locale = this.getLocale();
    return (
      <div className="page">
        <h1 className="page__title">{translate(locale, 'error.title')}</h1>
        <p className="notice notice--error">{error.message}</p>
        <p className="notice">
          {translate(locale, 'error.renderNote')} OpenAudioBooks {APP_VERSION}.
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => this.setState({ error: undefined })}
        >
          {translate(locale, 'common.retry')}
        </button>
      </div>
    );
  }
}