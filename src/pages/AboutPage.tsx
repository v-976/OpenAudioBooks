import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18nContext';
import { APP_STATUS_TRANSLATION_KEY, APP_VERSION } from '../version';

/** Project information, content principles and honest status. */
export function AboutPage() {
  const { t, languageName } = useI18n();

  return (
    <div className="page">
      <h1 className="page__title">{t('about.title')}</h1>
      <p className="page__subtitle">
        {APP_VERSION} · {t(APP_STATUS_TRANSLATION_KEY)}
      </p>

      <section className="section">
        <h2 className="section__title">{t('about.whatIs')}</h2>
        <p className="prose">{t('about.whatIsBody')}</p>
      </section>

      <section className="section">
        <h2 className="section__title">{t('about.privacy')}</h2>
        <p className="prose">{t('about.privacyBody')}</p>
      </section>

      <section className="section">
        <h2 className="section__title">{t('about.rights')}</h2>
        <p className="prose">{t('about.rightsBody')}</p>
        <p>
          <Link to="/browse/sources">{t('about.browseSources')}</Link>
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">{t('settings.languageIndependentNote')}</h2>
        <p className="prose">{t('settings.audioLanguagesHint')}</p>
        <ul className="chip-list">
          {['ru', 'en', 'fi'].map((code) => (
            <li key={code}>
              <span className="chip">{languageName(code)}</span>
            </li>
          ))}
        </ul>
        <p className="section__footnote">
          <Link to="/settings">{t('common.settings')}</Link>
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">{t('about.status')}</h2>
        <p className="prose">{t('about.statusBody', { version: APP_VERSION })}</p>
      </section>
    </div>
  );
}
