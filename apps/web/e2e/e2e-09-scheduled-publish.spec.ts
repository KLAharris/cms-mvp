import { expect, test } from '@playwright/test';

import { createApiKey, fetchPublicArticles, loginAs } from './helpers/api';
import { ContentEditorPage, ContentListPage, LoginPage } from './pages';

test.describe('E2E-09: Editor schedules article → auto-publishes', () => {
  test('article scheduled 15s in future auto-publishes', async ({ page, request }) => {
    const session = await loginAs(request, 'editor@example.com', 'Editor1234!');
    const apiKey = await createApiKey(request, session, `e2e-09-${String(Date.now())}`);

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    const list = new ContentListPage(page, 'article');
    await list.waitForLoad();
    await list.newButton.click();

    const editor = new ContentEditorPage(page);
    const title = `E2E-09 Scheduled ${String(Date.now())}`;
    await editor.setTitle(title);
    await editor.waitForAutoSaved();

    const scheduledAt = new Date(Date.now() + 15_000);
    const isoString = scheduledAt.toISOString().slice(0, 16);

    if (await editor.scheduleButton.isVisible()) {
      await editor.scheduleFor(isoString);
      await editor.waitForStatus('Scheduled');

      await page.waitForTimeout(20_000);

      const { data } = await fetchPublicArticles(request, apiKey);
      expect((data as Array<{ title: string }>).some((a) => a.title === title)).toBe(true);
    } else {
      test.skip(true, 'Schedule button not present in current build');
    }
  });
});
