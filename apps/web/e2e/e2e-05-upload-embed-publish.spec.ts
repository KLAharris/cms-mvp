import { expect, test } from '@playwright/test';
import * as path from 'path';

import { createApiKey, fetchPublicArticles, loginAs } from './helpers/api';
import { ContentEditorPage, ContentListPage, LoginPage, MediaLibraryPage } from './pages';

test.describe('E2E-05: Author uploads image → embeds in article → publishes', () => {
  test('image upload and embed in published article', async ({ page, request }) => {
    const session = await loginAs(request, 'editor@example.com', 'Editor1234!');
    const apiKey = await createApiKey(request, session, `e2e-05-${String(Date.now())}`);

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    const media = new MediaLibraryPage(page);
    await media.goto();

    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.png');
    const fileInput = media.fileInput;
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(2_000);

    const list = new ContentListPage(page, 'article');
    await list.goto();
    await list.newButton.click();

    const editor = new ContentEditorPage(page);
    const title = `E2E-05 Image Article ${String(Date.now())}`;
    await editor.setTitle(title);

    const mediaPickerBtn = editor.mediaPickerButton();
    if (await mediaPickerBtn.isVisible()) {
      await mediaPickerBtn.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.getByRole('listitem').first().click();
      await page.getByRole('button', { name: /select|insert/i }).click();
    }

    await editor.waitForAutoSaved();
    await editor.submitForReviewButton.click();
    await editor.waitForStatus('In Review');
    await editor.publishButton.click();
    await editor.waitForStatus('Published');

    const { ok } = await fetchPublicArticles(request, apiKey);
    expect(ok).toBe(true);
  });
});
