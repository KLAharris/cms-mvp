import type { Page } from '@playwright/test';

export class AuditLogPage {
  constructor(private readonly page: Page) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get table() { return this.page.getByRole('table'); }
  get rows() { return this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') }); }

  async goto(): Promise<void> {
    await this.page.goto('/audit');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async hasEvent(action: string): Promise<boolean> {
    return (await this.page.getByText(action).count()) > 0;
  }
}
