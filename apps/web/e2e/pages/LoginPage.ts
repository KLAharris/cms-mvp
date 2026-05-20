import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  get emailInput() { return this.page.getByRole('textbox', { name: /email/i }); }
  get passwordInput() { return this.page.getByLabel(/^password$/i); }
  get submitButton() { return this.page.getByRole('button', { name: /sign in/i }); }
  get errorAlert() { return this.page.getByRole('alert'); }
  get forgotPasswordLink() { return this.page.getByRole('link', { name: /forgot password/i }); }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForURL('/login');
    await this.submitButton.waitFor({ state: 'visible' });
  }
}
