/**
 * Identifier helpers.
 *
 * Ids are namespaced with the source id so that two providers describing the
 * same person never collide, while stable local ids (`local:*`) stay usable
 * for user-created records such as bookmarks.
 */

export type SourceId = string;

export const LOCAL_SOURCE_PREFIX = 'local:';
export const USER_RECORD_PREFIX = 'user:';

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_SOURCE_PREFIX);
}

export function sourceScopedId(sourceId: SourceId, localId: string): string {
  return `${sourceId}:${localId}`;
}

export function userRecordId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${USER_RECORD_PREFIX}${uuid}`;
}
