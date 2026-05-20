import { expect, test } from '@playwright/test';

import { loginAs } from './helpers/api';
import { ContentEditorPage, ContentListPage, LoginPage } from './pages';

test.describe('E2E-03: Author submits → editor rejects → author edits → editor approves', () => {
  test('full review cycle completes successfully', async ({ page, request }) => {
    const authorSession = await loginAs(request, 'author@example.com', 'Author1234!');
    expect(authorSession.accessToken).toBeTruthy();

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('author@example.com', 'Author1234!');

    const list = new ContentListPage(page, 'article');
    await list.waitForLoad();
    await list.newButton.click();

    const editor = new ContentEditorPage(page);
    const title = `E2E-03 Review Article ${String(Date.now())}`;
    await editor.setTitle(title);
    await editor.waitForAutoSaved();

    await editor.submitForReviewButton.click();
    await editor.waitForStatus('In Review');

    const articleUrl = page.url();

    await page.evaluate(() => { localStorage.clear(); });
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    await page.goto(articleUrl);
    await editor.waitForStatus('In Review');

    await page.getByRole('button', { name: /reject/i }).click();
    await page.getByRole('textbox', { name: /reason|note/i }).fill('Needs more detail');
    await page.getByRole('button', { name: /confirm reject/i }).click();
    await editor.waitForStatus('Draft');

    await page.evaluate(() => { localStorage.clear(); });
    await login.goto();
    await login.signIn('author@example.com', 'Author1234!');

    await page.goto(articleUrl);
    await editor.setBody('Updated with more detail');
    await editor.waitForAutoSaved();
    await editor.submitForReviewButton.click();
    await editor.waitForStatus('In Review');

    await page.evaluate(() => { localStorage.clear(); });
    await login.goto();
    await login.signIn('editor@example.com', 'Editor1234!');

    await page.goto(articleUrl);
    await editor.publishButton.click();
    await editor.waitForStatus('Published');

    await expect(editor.statusChip).toContainText('Published');
  });
});
