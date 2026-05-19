import { PasswordResetNotifier } from '../../application/ports/out/password-reset-notifier.port';

export class FakeNotificationService implements PasswordResetNotifier {
  readonly passwordResetEmails: Array<{ to: string; token: string }> = [];

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.passwordResetEmails.push({ to, token });
    return Promise.resolve();
  }
}
