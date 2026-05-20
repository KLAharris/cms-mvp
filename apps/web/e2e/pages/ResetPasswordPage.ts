import type { Page } from '@playwright/test';

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  get passwordInput() { return this.page.getByLabel(/^new password$/i); }
  get confirmInput() { return this.page.getByLabel(/confirm/i); }
  get submitButton() { return this.page.getByRole('button', { name: /reset password/i }); }
  get successMessage() { return this.page.getByText(/password.*reset|reset.*success/i); }

  async goto(token: string): Promise<void> {
    await this.page.goto(`/reset-password?token=${token}`);
  }

  async resetPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(password);
    await this.submitButton.click();
  }

  async waitForLoad(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
  }
}
