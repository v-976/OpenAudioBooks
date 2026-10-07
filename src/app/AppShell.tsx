import { NavLink, Outlet } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { formatDuration } from '../player/playerMachine';
import { MiniPlayer } from '../components/MiniPlayer';

const NAV_ITEMS = [
  { to: '/', label: 'Library', end: true },
  { to: '/search', label: 'Search', end: false },
  { to: '/now-playing', label: 'Now Playing', end: false },
  { to: '/my-books', label: 'My Books', end: false },
];

/**
 * Application shell: header, primary navigation and the persistent transport.
 * Mobile-first; the nav is a fixed bottom bar with large touch targets.
 */
export function AppShell() {
  const player = usePlayer();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <p className="app-header__title">OpenAudioBooks</p>
          <p className="app-header__status">
            Alpha 0.1.0 · development build · not production-ready
          </p>
        </div>
      </header>

      <main className="app-main" id="main-content">
        <Outlet />
      </main>

      {player.current ? <MiniPlayer /> : null}

      <nav className="app-nav" aria-label="Primary">
        <ul className="app-nav__list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                }
              >
                <span className="app-nav__label">{item.label}</span>
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
