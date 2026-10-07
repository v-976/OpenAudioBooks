import { Link } from 'react-router-dom';

/** Shared "not found" state so error screens stay consistent. */
export function NotFound({ title, body }: { title: string; body: string }) {
  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>
      <p className="notice">{body}</p>
      <p>
        <Link className="button button--primary" to="/">
          Back to library
        </Link>
      </p>
    </div>
  );
}
