import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18nContext';

/** Shared "not found" state so error screens stay consistent. */
export function NotFound({ title, body }: { title: string; body: string }) {
  const { t } = useI18n();
  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>
      <p className="notice">{body}</p>
      <p>
        <Link className="button button--primary" to="/">
          {t('notFound.backToLibrary')}
        </Link>
      </p>
    </div>
  );
}
