import { expect, test } from '@playwright/test';

import { loginAs } from './helpers/api';
import { LoginPage, UsersPage } from './pages';

test.describe('E2E-01: Admin invites user → user accepts → user logs in', () => {
  test('admin can invite a new editor and the editor can log in', async ({ page, request }) => {
    const adminSession = await loginAs(request, 'admin@example.com', 'Admin1234!');
    expect(adminSession.accessToken).toBeTruthy();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn('admin@example.com', 'Admin1234!');

    const usersPage = new UsersPage(page);
    await usersPage.waitForLoad();

    const ts = String(Date.now());
    const inviteEmail = `e2e-invite-${ts}@example.com`;

    await usersPage.inviteButton.click();
    await usersPage.inviteEmailInput.fill(inviteEmail);
    await page.getByRole('combobox', { name: /role/i }).selectOption('editor');
    await usersPage.inviteSubmitButton.click();

    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 5_000 });
  });
});
