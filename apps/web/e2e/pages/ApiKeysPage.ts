import type { Page } from '@playwright/test';

export class ApiKeysPage {
  constructor(private readonly page: Page) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get createButton() { return this.page.getByRole('button', { name: /create|new api key/i }); }
  get keyNameInput() { return this.page.getByRole('textbox', { name: /name/i }); }
  get createSubmitButton() { return this.page.getByRole('button', { name: /^create$/i }); }
  get createdKeyValue() { return this.page.getByTestId('created-key-value'); }
  get keysTable() { return this.page.getByRole('table'); }

  async goto(): Promise<void> {
    await this.page.goto('/api-keys');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async createApiKey(name: string): Promise<string> {
    await this.createButton.click();
    await this.keyNameInput.fill(name);
    await this.createSubmitButton.click();
    await this.createdKeyValue.waitFor({ state: 'visible' });
    return (await this.createdKeyValue.textContent()) ?? '';
  }

  async revokeApiKey(name: string): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: /revoke/i }).click();
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
  }
}
