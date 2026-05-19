export type SentInviteNotification = {
  to: string;
  token: string;
  role: string;
};

export class FakeNotificationService {
  readonly sentInvites: SentInviteNotification[] = [];
  readonly sentPasswordResets: { to: string; token: string }[] = [];

  sendInviteEmail(to: string, token: string, role: string): Promise<void> {
    this.sentInvites.push({ to, token, role });
    return Promise.resolve();
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.sentPasswordResets.push({ to, token });
    return Promise.resolve();
  }
}
