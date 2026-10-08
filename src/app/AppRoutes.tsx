import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LibraryPage } from '../pages/LibraryPage';
import { SearchPage } from '../pages/SearchPage';
import { NowPlayingPage } from '../pages/NowPlayingPage';
import { MyBooksPage } from '../pages/MyBooksPage';
import { WorkPage } from '../pages/WorkPage';
import { AuthorPage } from '../pages/AuthorPage';
import { NarratorPage } from '../pages/NarratorPage';
import { EditionPage } from '../pages/EditionPage';
import { SourcePage } from '../pages/SourcePage';
import { BrowsePage } from '../pages/BrowsePage';
import { AboutPage } from '../pages/AboutPage';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * Route table. Entity routes use the paths from the specification:
 * /authors/:id, /narrators/:id, /works/:id, /editions/:id, /sources/:id.
 *
 * Paths are NOT localised: they stay stable identifiers in English so that deep
 * links and the Android client keep working regardless of interface language.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="now-playing" element={<NowPlayingPage />} />
        <Route path="my-books" element={<MyBooksPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="works/:workId" element={<WorkPage />} />
        <Route path="authors/:authorId" element={<AuthorPage />} />
        <Route path="narrators/:narratorId" element={<NarratorPage />} />
        <Route path="editions/:editionId" element={<EditionPage />} />
        <Route path="sources/:sourceId" element={<SourcePage />} />
        <Route path="browse/:kind" element={<BrowsePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
