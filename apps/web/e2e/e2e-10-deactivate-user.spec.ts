import { expect, test } from '@playwright/test';

import { loginAs } from './helpers/api';
import { LoginPage, UsersPage } from './pages';

test.describe('E2E-10: Admin deactivates user → user cannot log back in', () => {
  test('deactivated user is denied login', async ({ page, request }) => {
    const adminSession = await loginAs(request, 'admin@example.com', 'Admin1234!');
    expect(adminSession.accessToken).toBeTruthy();

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn('admin@example.com', 'Admin1234!');

    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await usersPage.deactivateUser('author@example.com');

    await page.evaluate(() => { localStorage.clear(); });
    await login.goto();
    await login.signIn('author@example.com', 'Author1234!');

    await expect(login.errorAlert).toBeVisible({ timeout: 5_000 });

    const adminLogin = await loginAs(request, 'admin@example.com', 'Admin1234!');
    const reactivateRes = await request.patch(
      `${process.env.E2E_API_URL ?? 'http://localhost:3000/api/admin'}/users/${encodeURIComponent('author@example.com')}/activate`,
      { headers: { Authorization: `Bearer ${adminLogin.accessToken}` } },
    );
    void reactivateRes;
  });
});
