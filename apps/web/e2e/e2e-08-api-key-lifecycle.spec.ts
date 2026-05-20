import { expect, test } from '@playwright/test';

import { fetchPublicArticles } from './helpers/api';
import { ApiKeysPage, LoginPage } from './pages';

test.describe('E2E-08: Admin creates API key → fetches articles → revokes → fetch fails', () => {
  test('API key creation and revocation works end-to-end', async ({ page, request }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('admin@example.com', 'Admin1234!');

    const apiKeysPage = new ApiKeysPage(page);
    await apiKeysPage.goto();

    const keyName = `e2e-08-key-${String(Date.now())}`;
    const rawKey = await apiKeysPage.createApiKey(keyName);
    expect(rawKey.length).toBeGreaterThan(0);

    const { ok: beforeRevoke } = await fetchPublicArticles(request, rawKey);
    expect(beforeRevoke).toBe(true);

    await apiKeysPage.revokeApiKey(keyName);

    await page.waitForTimeout(500);

    const { ok: afterRevoke } = await fetchPublicArticles(request, rawKey);
    expect(afterRevoke).toBe(false);
  });
});
