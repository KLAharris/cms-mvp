export interface EmailSender {
  sendInvite(params: {
    to: string;
    name: string;
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<void>;
}
