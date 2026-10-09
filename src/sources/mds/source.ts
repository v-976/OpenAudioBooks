import type { Source } from '../../domain/types';

export const MDS_SOURCE_ID = 'mds';
export const MDS_SOURCE_URL = 'https://mds-old.ru/';

export const MDS_SOURCE: Source = {
  id: MDS_SOURCE_ID,
  name: 'Модель для сборки',
  sourceUrl: MDS_SOURCE_URL,
  sourceType: 'other',
  rightsStatus: 'unknown',
  attribution:
    'Запись предоставлена неофициальным архивом передачи «Модель для сборки» (mds-old.ru).',
  availabilityNotes:
    'Правовой статус записи источником не указан. Метаданные индексируются из публичных страниц; аудио передаётся напрямую с mds-old.ru и не хранится в OpenAudioBooks.',
};

export function mdsPlaybackUrl(providerId: string): string {
  return new URL(`/api/play/${encodeURIComponent(providerId)}`, MDS_SOURCE_URL).href;
}
