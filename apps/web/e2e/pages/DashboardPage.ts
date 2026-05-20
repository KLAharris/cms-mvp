import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get newArticleButton() { return this.page.getByRole('button', { name: /new article/i }); }
  get statCards() { return this.page.getByRole('article'); }

  async waitForLoad(): Promise<void> {
    await this.page.waitForURL('**/dashboard');
    await this.heading.waitFor({ state: 'visible' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }
}
