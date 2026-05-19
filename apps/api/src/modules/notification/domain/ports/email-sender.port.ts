export interface IEmailSenderPort {
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
  sendInviteEmail(to: string, inviteLink: string, role: string): Promise<void>;
}

export const EMAIL_SENDER_PORT = Symbol('EMAIL_SENDER_PORT');
