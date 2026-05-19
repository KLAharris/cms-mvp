import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { IEmailSenderPort } from '../../../domain/ports/email-sender.port';

@Injectable()
export class ResendEmailSenderAdapter implements IEmailSenderPort {
  private resend: Resend | undefined;
  private fromAddress: string | undefined;

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const result = await this.getResend().emails.send({
      from: this.getFromAddress(),
      to,
      subject: 'Reset your password',
      html: emailHtml({
        title: 'Reset your password',
        body: 'Use the link below to reset your password.',
        link: resetLink,
        linkText: 'Reset password',
      }),
    });

    throwIfResendError(result.error);
  }

  async sendInviteEmail(to: string, inviteLink: string, role: string): Promise<void> {
    const result = await this.getResend().emails.send({
      from: this.getFromAddress(),
      to,
      subject: "You've been invited",
      html: emailHtml({
        title: "You've been invited",
        body: `You have been invited with the ${role} role.`,
        link: inviteLink,
        linkText: 'Accept invite',
      }),
    });

    throwIfResendError(result.error);
  }

  private getResend(): Resend {
    this.resend ??= new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    return this.resend;
  }

  private getFromAddress(): string {
    this.fromAddress ??= this.config.getOrThrow<string>('RESEND_FROM_ADDRESS');
    return this.fromAddress;
  }
}

function throwIfResendError(error: { message?: string } | null | undefined): void {
  if (error !== null && error !== undefined) {
    throw new Error(error.message ?? 'Resend email delivery failed');
  }
}

function emailHtml(input: {
  title: string;
  body: string;
  link: string;
  linkText: string;
}): string {
  const title = escapeHtml(input.title);
  const body = escapeHtml(input.body);
  const link = escapeHtml(input.link);
  const linkText = escapeHtml(input.linkText);

  return `<!DOCTYPE html>
<html lang="en">
<body>
  <h1>${title}</h1>
  <p>${body}</p>
  <p><a href="${link}">${linkText}</a></p>
  <p>${link}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
