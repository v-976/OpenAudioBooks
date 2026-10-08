import { NavLink, Outlet } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { formatDuration } from '../player/playerMachine';
import { MiniPlayer } from '../components/MiniPlayer';
import { useI18n } from '../i18n/i18nContext';
import type { TranslationKey } from '../i18n/keys';

/**
 * Application shell: header, primary navigation and the persistent transport.
 * Mobile-first; the nav is a fixed bottom bar with large touch targets.
 */
export function AppShell() {
  const player = usePlayer();
  const { t } = useI18n();

  const navItems: { to: string; labelKey: TranslationKey; end: boolean }[] = [
    { to: '/', labelKey: 'nav.library', end: true },
    { to: '/search', labelKey: 'nav.search', end: false },
    { to: '/now-playing', labelKey: 'nav.nowPlaying', end: false },
    { to: '/my-books', labelKey: 'nav.myBooks', end: false },
  ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t('common.skipToContent')}
      </a>

      <header className="app-header">
        <div className="app-header__titles">
          <p className="app-header__title">{t('app.name')}</p>
          <p className="app-header__status">{t('status.alpha')}</p>
        </div>
        <NavLink to="/settings" className="app-header__settings">
          {t('common.settings')}
        </NavLink>
      </header>

      <main className="app-main" id="main-content">
        <Outlet />
      </main>

      {player.current ? <MiniPlayer /> : null}

      <nav className="app-nav" aria-label={t('nav.primary')}>
        <ul className="app-nav__list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                }
              >
                <span className="app-nav__label">{t(item.labelKey)}</span>
                {item.to === '/now-playing' && player.current ? (
                  <span className="app-nav__badge">
                    {formatDuration(player.positionSeconds)}
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
