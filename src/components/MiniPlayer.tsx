import { Link } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { formatDuration } from '../player/playerMachine';
import { useI18n } from '../i18n/i18nContext';

/**
 * Persistent transport strip shown above the bottom navigation whenever an
 * edition is loaded, so playback controls are always one tap away.
 */
export function MiniPlayer() {
  const player = usePlayer();
  const { t, narrationLanguageName } = useI18n();
  if (!player.current) return null;

  const { edition, track } = player.current;
  const percent = Math.round(player.editionProgress * 100);

  return (
    <div className="mini-player">
      <div className="mini-player__progress" aria-hidden="true">
        <div className="mini-player__progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="mini-player__row">
        <button
          type="button"
          className="button button--icon button--large"
          onClick={() => void player.toggle()}
          aria-label={player.playing ? t('player.pause') : t('player.play')}
        >
          {player.playing ? '❚❚' : '▶'}
        </button>
        <Link to="/now-playing" className="mini-player__meta">
          <span className="mini-player__title">{track.title}</span>
          <span className="mini-player__subtitle">
            {narrationLanguageName(edition.narrationLanguage)}
          </span>
        </Link>
        <span className="mini-player__time">
          {formatDuration(player.positionSeconds)} / {formatDuration(player.durationSeconds)}
        </span>
      </div>
    </div>
  );
}
