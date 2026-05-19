import { Injectable } from '@nestjs/common';

import { EmailQueueProducerPort } from './ports/email-queue-producer.port';

@Injectable()
export class NotificationService {
  constructor(
    private readonly producer: EmailQueueProducerPort,
    private readonly frontendBaseUrl: string,
  ) {}

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.producer.enqueue({
      type: 'password-reset',
      to,
      resetLink: this.link('/reset-password', token),
    });
  }

  async sendInviteEmail(to: string, token: string, role: string): Promise<void> {
    await this.producer.enqueue({
      type: 'invite',
      to,
      inviteLink: this.link('/accept-invite', token),
      role,
    });
  }

  private link(path: string, token: string): string {
    const url = new URL(path, this.frontendBaseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }
}
