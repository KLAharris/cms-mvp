import type { Page } from '@playwright/test';

export class MediaLibraryPage {
  constructor(private readonly page: Page) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get dropZone() { return this.page.getByTestId('drop-zone'); }
  get fileInput() { return this.page.getByTestId('file-input'); }
  get mediaGrid() { return this.page.getByRole('list'); }

  async goto(): Promise<void> {
    await this.page.goto('/media');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForResponse((r) => r.url().includes('/media') && r.request().method() === 'POST');
  }

  async getMediaItemCount(): Promise<number> {
    return this.page.locator('[role="listitem"]').count();
  }
}
