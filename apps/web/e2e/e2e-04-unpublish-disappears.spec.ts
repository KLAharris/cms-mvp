import { expect, test } from '@playwright/test';

import { createApiKey, fetchPublicArticles, loginAs } from './helpers/api';
import { ContentEditorPage, ContentListPage, LoginPage } from './pages';

test.describe('E2E-04: Editor unpublishes article → disappears from public API', () => {
  test('unpublished article no longer appears in public API', async ({ page, request }) => {
    const ts = String(Date.now());
    const session = await loginAs(request, 'editor@example.com', 'Editor1234!');
    const apiKey = await createApiKey(request, session, `e2e-04-${ts}`);

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    const list = new ContentListPage(page, 'article');
    await list.waitForLoad();
    await list.newButton.click();

    const editor = new ContentEditorPage(page);
    const title = `E2E-04 Unpublish ${ts}`;
    await editor.setTitle(title);
    await editor.waitForAutoSaved();
    await editor.submitForReviewButton.click();
    await editor.waitForStatus('In Review');
    await editor.publishButton.click();
    await editor.waitForStatus('Published');

    const { ok: afterPublish, data: publishedData } = await fetchPublicArticles(request, apiKey);
    expect(afterPublish).toBe(true);
    expect((publishedData as Array<{ title: string }>).some((a) => a.title === title)).toBe(true);

    await editor.unpublishButton.click();
    await editor.waitForStatus('Unpublished');

    const { data: afterUnpublish } = await fetchPublicArticles(request, apiKey);
    expect((afterUnpublish as Array<{ title: string }>).some((a) => a.title === title)).toBe(false);
  });
});
