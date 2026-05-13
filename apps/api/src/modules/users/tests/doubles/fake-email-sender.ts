import { EmailSender } from '../../application/ports/out/email-sender.port';

export type SentInvite = {
  to: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
};

export class FakeEmailSender implements EmailSender {
  readonly sentInvites: SentInvite[] = [];

  sendInvite(params: SentInvite): Promise<void> {
    this.sentInvites.push(params);
    return Promise.resolve();
  }
}
