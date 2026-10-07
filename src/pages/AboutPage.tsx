import { Link } from 'react-router-dom';
import { APP_STATUS, APP_VERSION } from '../version';

/** Project information, content principles and honest status. */
export function AboutPage() {
  return (
    <div className="page">
      <h1 className="page__title">About OpenAudioBooks</h1>
      <p className="page__subtitle">
        {APP_VERSION} · {APP_STATUS}
      </p>

      <section className="section">
        <h2 className="section__title">What this is</h2>
        <p className="prose">
          OpenAudioBooks is a free, public, non-commercial application for discovering, cataloguing
          and listening to audiobooks that are legally available to listen to for free from
          external sources. It is an aggregator and a player. It does not claim ownership of any
          audiobook content, and it does not host audiobook files: audio is streamed from the
          source that legitimately provides it.
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">Privacy</h2>
        <p className="prose">
          The application is local-first. There is no account, no sign-in, no server-side profile
          and no cloud sync. Playback positions, bookmarks, favourites and listening history are
          stored in your browser on your own device. There is no telemetry, no analytics, no
          advertising and no tracking of any kind.
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">Rights and sources</h2>
        <p className="prose">
          &ldquo;Free to listen&rdquo; does not mean public domain. Every audio edition and source
          carries its own rights status, licence name, attribution and original source link, and
          unknown rights are labelled as unknown rather than assumed.
        </p>
        <p>
          <Link to="/sources">Browse sources</Link>
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">Development status</h2>
        <p className="prose">
          This is Alpha {APP_VERSION}. Real provider integrations are not implemented yet; the
          catalogue you see contains bundled development fixtures, marked as such throughout the
          interface. Treat this build as an architectural preview, not a usable library.
        </p>
      </section>
    </div>
  );
}
