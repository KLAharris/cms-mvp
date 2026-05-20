import type { Page, Locator } from '@playwright/test';

export class ContentEditorPage {
  constructor(private readonly page: Page) {}

  get titleInput() { return this.page.getByRole('textbox', { name: /title/i }).first(); }
  get statusChip() { return this.page.getByTestId('status-chip'); }
  get autosaveIndicator() { return this.page.getByTestId('autosave-indicator'); }
  get publishButton() { return this.page.getByRole('button', { name: /^publish$/i }); }
  get submitForReviewButton() { return this.page.getByRole('button', { name: /submit for review/i }); }
  get unpublishButton() { return this.page.getByRole('button', { name: /unpublish/i }); }
  get backButton() { return this.page.getByRole('link', { name: /back|articles|pages/i }).first(); }
  get scheduleButton() { return this.page.getByRole('button', { name: /schedule/i }); }
  get scheduledAtInput() { return this.page.getByLabel(/schedule.*at|publish.*at/i); }

  async setTitle(value: string): Promise<void> {
    await this.titleInput.fill(value);
  }

  async setBody(value: string): Promise<void> {
    const editor = this.page.locator('.tiptap, [contenteditable="true"]').first();
    await editor.click();
    await editor.fill(value);
  }

  async setSeoDescription(value: string): Promise<void> {
    await this.page.getByRole('textbox', { name: /meta description/i }).fill(value);
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  async submitForReview(): Promise<void> {
    await this.submitForReviewButton.click();
  }

  async unpublish(): Promise<void> {
    await this.unpublishButton.click();
  }

  async waitForAutoSaved(): Promise<void> {
    await this.page.getByText(/saved \d+ seconds? ago|saved just now/i).waitFor({ timeout: 10_000 });
  }

  async waitForStatus(status: string): Promise<void> {
    await this.page.getByTestId('status-chip').filter({ hasText: new RegExp(status, 'i') }).waitFor({ timeout: 10_000 });
  }

  async scheduleFor(isoDatetime: string): Promise<void> {
    await this.scheduleButton.click();
    await this.scheduledAtInput.fill(isoDatetime);
    await this.page.getByRole('button', { name: /confirm|save/i }).click();
  }

  mediaPickerButton(): Locator {
    return this.page.getByRole('button', { name: /insert media|add image/i });
  }
}
