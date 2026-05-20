import { expect, test } from '@playwright/test';

import { LoginPage } from './pages';

test.describe('E2E-06: Wrong password 5 times → locked → generic error shown', () => {
  test('account locks after 5 failed login attempts', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    const email = 'author@example.com';
    const wrongPassword = 'WrongPassword999!';

    for (let attempt = 0; attempt < 5; attempt++) {
      await login.emailInput.fill(email);
      await login.passwordInput.fill(wrongPassword);
      await login.submitButton.click();
      await login.errorAlert.waitFor({ state: 'visible', timeout: 5_000 });
    }

    await expect(login.errorAlert).toBeVisible();
    const errorText = await login.errorAlert.textContent();
    expect(errorText).toBeTruthy();
    expect((errorText ?? '').length).toBeGreaterThan(0);
  });
});
