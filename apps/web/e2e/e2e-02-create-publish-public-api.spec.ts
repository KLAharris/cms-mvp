import { expect, test } from '@playwright/test';

import { createApiKey, fetchPublicArticles, loginAs } from './helpers/api';
import { ContentEditorPage, ContentListPage, LoginPage } from './pages';

test.describe('E2E-02: Editor creates draft → submits → publishes → appears in public API', () => {
  test('published article appears in public API response', async ({ page, request }) => {
    const ts = String(Date.now());
    const session = await loginAs(request, 'editor@example.com', 'Editor1234!');
    const apiKey = await createApiKey(request, session, `e2e-02-${ts}`);

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    const list = new ContentListPage(page, 'article');
    await list.waitForLoad();
    await list.newButton.click();

    const editor = new ContentEditorPage(page);
    const title = `E2E-02 Article ${ts}`;
    await editor.setTitle(title);
    await editor.waitForAutoSaved();

    await editor.submitForReviewButton.click();
    await editor.waitForStatus('In Review');

    await editor.publishButton.click();
    await editor.waitForStatus('Published');

    const { ok, data } = await fetchPublicArticles(request, apiKey);
    expect(ok).toBe(true);
    expect((data as Array<{ title: string }>).some((a) => a.title === title)).toBe(true);
  });
});
