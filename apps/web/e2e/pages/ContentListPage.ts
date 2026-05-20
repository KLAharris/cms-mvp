import type { Page } from '@playwright/test';

export class ContentListPage {
  constructor(
    private readonly page: Page,
    private readonly type: 'article' | 'page' = 'article',
  ) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get newButton() { return this.page.getByRole('button', { name: /^new$/i }); }
  get searchInput() { return this.page.getByPlaceholder(/search/i); }
  get table() { return this.page.getByRole('table'); }
  get rows() { return this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') }); }

  async goto(): Promise<void> {
    await this.page.goto(`/${this.type}s`);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async clickNew(): Promise<void> {
    await this.newButton.click();
    await this.page.waitForURL(`**/${this.type}s/**/edit`);
  }

  async clickRowByTitle(title: string): Promise<void> {
    await this.page.getByRole('cell', { name: title }).click();
  }

  async openRowMenu(rowIndex: number): Promise<void> {
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    await rows.nth(rowIndex).getByRole('button', { name: /row actions/i }).click();
  }

  async clickMenuItem(label: string): Promise<void> {
    await this.page.getByRole('menuitem', { name: label }).click();
  }
}
