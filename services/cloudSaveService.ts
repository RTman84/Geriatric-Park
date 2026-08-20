import { getAccessToken } from './authService';

export interface CloudSaveRecord {
  schema_version: number;
  client_revision: number;
  save_data: Record<string, unknown>;
  updated_at: string;
}

function apiUrl(path: string): string {
  return path;
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Cloud save request failed.');
  return body as T;
}

export async function fetchCloudSave(): Promise<CloudSaveRecord | null> {
  return (await parse<{ save: CloudSaveRecord | null }>(await fetch(apiUrl('/api/account/save'), {
    headers: authHeaders(),
    cache: 'no-store',
  }))).save;
}

export async function uploadCloudSave(
  schemaVersion: number,
  clientRevision: number,
  saveData: Record<string, unknown>,
): Promise<CloudSaveRecord> {
  const result = await parse<{ save: CloudSaveRecord }>(await fetch(apiUrl('/api/account/save'), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ schemaVersion, clientRevision, saveData }),
  }));
  return result.save;
}
