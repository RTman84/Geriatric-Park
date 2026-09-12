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
  if (!response.ok) {
    // TEMPORARY: fold the server's diagnostic `debug` field (9-12-26 401
    // investigation) into the thrown error message -- see the same change in
    // leaderboardService.ts for context.
    const base = body.error || 'Cloud save request failed.';
    const debugSuffix = body.debug ? ` | debug: ${JSON.stringify(body.debug)}` : '';
    throw new Error(base + debugSuffix);
  }
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
  return (await parse<{ save: CloudSaveRecord }>(response)).save;
}
