export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type SendInviteOptions = {
  to: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
};

export interface EmailSender {
  sendInvite(params: SendInviteOptions): Promise<void>;
}
