import { getAccessToken } from './authService';

export interface CloudSaveRecord {
  schema_version: number;
  client_revision: number;
  save_data: Record<string, unknown>;
  updated_at: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Cloud save request failed.');
  return body as T;
}

export async function fetchCloudSave(): Promise<CloudSaveRecord | null> {
  const headers = await authHeaders();
  const response = await fetch('/api/account/save', {
    headers,
    cache: 'no-store',
  });
  return (await parse<{ save: CloudSaveRecord | null }>(response)).save;
}

export async function uploadCloudSave(
  schemaVersion: number,
  clientRevision: number,
  saveData: Record<string, unknown>,
): Promise<CloudSaveRecord> {
  const headers = await authHeaders();
  const response = await fetch('/api/account/save', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ schemaVersion, clientRevision, saveData }),
  });
  const body = await parse<{ save: CloudSaveRecord; profileSyncError?: string }>(response);
  // TEMPORARY (9-15-26 profile-sync investigation): log a failed background
  // profile sync (used by the friends system) without failing the actual
  // save, which succeeded. Revert once resolved -- see api/account/save.ts.
  if (body.profileSyncError) {
    console.error('Player profile sync failed (friends list may show stale/default data):', body.profileSyncError);
  }
  return body.save;
}
