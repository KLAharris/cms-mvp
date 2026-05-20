import type { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3000/api/admin';
const PUBLIC_API_BASE = process.env.E2E_API_URL
  ? process.env.E2E_API_URL.replace('/api/admin', '/api/v1')
  : 'http://localhost:3000/api/v1';

export interface Session {
  accessToken: string;
}

export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<Session> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  const body = await res.json() as { accessToken: string };
  return { accessToken: body.accessToken };
}

export async function createApiKey(
  request: APIRequestContext,
  session: Session,
  name: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/api-keys`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: { name },
  });
  const body = await res.json() as { rawKey: string };
  return body.rawKey;
}

export async function revokeApiKey(
  request: APIRequestContext,
  session: Session,
  id: string,
): Promise<void> {
  await request.delete(`${API_BASE}/api-keys/${id}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
}

export async function fetchPublicArticles(
  request: APIRequestContext,
  apiKey: string,
): Promise<{ ok: boolean; data: unknown[] }> {
  const res = await request.get(`${PUBLIC_API_BASE}/articles`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok()) return { ok: false, data: [] };
  const body = await res.json() as { data: unknown[] };
  return { ok: true, data: body.data };
}

export async function inviteUser(
  request: APIRequestContext,
  session: Session,
  email: string,
  role: string,
): Promise<void> {
  await request.post(`${API_BASE}/users/invite`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: { email, role },
  });
}

export async function deactivateUser(
  request: APIRequestContext,
  session: Session,
  userId: string,
): Promise<void> {
  await request.patch(`${API_BASE}/users/${userId}/deactivate`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
}
