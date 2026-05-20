import type { Page } from '@playwright/test';

export class UsersPage {
  constructor(private readonly page: Page) {}

  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get inviteButton() { return this.page.getByRole('button', { name: /invite/i }); }
  get inviteEmailInput() { return this.page.getByRole('textbox', { name: /email/i }); }
  get inviteRoleSelect() { return this.page.getByRole('combobox', { name: /role/i }); }
  get inviteSubmitButton() { return this.page.getByRole('button', { name: /send invite/i }); }
  get usersTable() { return this.page.getByRole('table'); }

  async goto(): Promise<void> {
    await this.page.goto('/users');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async inviteUser(email: string, role: string): Promise<void> {
    await this.inviteButton.click();
    await this.inviteEmailInput.fill(email);
    await this.inviteRoleSelect.selectOption(role);
    await this.inviteSubmitButton.click();
  }

  async openUserMenu(email: string): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: email });
    await row.getByRole('button', { name: /actions|more/i }).click();
  }

  async deactivateUser(email: string): Promise<void> {
    await this.openUserMenu(email);
    await this.page.getByRole('menuitem', { name: /deactivate/i }).click();
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
  }
}
