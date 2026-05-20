import type { Page } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  get emailInput() { return this.page.getByRole('textbox', { name: /email/i }); }
  get submitButton() { return this.page.getByRole('button', { name: /send reset/i }); }
  get successMessage() { return this.page.getByText(/check your email/i); }

  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
  }

  async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForURL('/forgot-password');
    await this.submitButton.waitFor({ state: 'visible' });
  }
}
