import { expect, test } from '@playwright/test';

import { ForgotPasswordPage } from './pages';

test.describe('E2E-07: Forgot password flow', () => {
  test('requesting password reset shows confirmation', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await forgotPage.requestReset('admin@example.com');

    await expect(
      page.getByText(/check your email|reset link sent|email.*sent/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
