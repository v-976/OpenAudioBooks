import { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION } from '../version';

interface State {
  error?: Error;
}

/**
 * Minimal error boundary. Keeps a rendering failure inside one screen instead
 * of a blank page, and never reports the error anywhere.
 *
 * The fallback screen is intentionally kept in Russian and outside the i18n
 * layer: if the boundary itself fails because of a translation problem, this
 * message must still render.
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
        <h1 className="page__title">Что-то пошло не так</h1>
        <p className="notice notice--error">{error.message}</p>
        <p className="notice">
          Ошибка записана только в консоль этого устройства. Данные никуда не отправляются.
          OpenAudioBooks {APP_VERSION}.
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => this.setState({ error: undefined })}
        >
          Повторить
        </button>
      </div>
    );
  }
}
