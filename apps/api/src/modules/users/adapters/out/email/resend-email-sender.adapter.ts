import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  EmailSender,
  SendInviteOptions,
} from '../../../application/ports/out/email-sender.port';

@Injectable()
export class ResendEmailSenderAdapter implements EmailSender {
  private readonly logger = new Logger(ResendEmailSenderAdapter.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    const emailFrom = config.getOrThrow<string>('EMAIL_FROM');
    const emailFromName = config.getOrThrow<string>('EMAIL_FROM_NAME');
    this.from = `${emailFromName} <${emailFrom}>`;
    this.publicUrl = config.getOrThrow<string>('PUBLIC_URL');
  }

  async sendInvite(options: SendInviteOptions): Promise<void> {
    const inviteUrl = this.buildPublicInviteUrl(options.inviteUrl);
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: options.to,
      subject: 'You have been invited to CMS',
      html: buildInviteHtml({
        inviteUrl,
        recipientName: options.name,
        expiresInDays: daysUntil(options.expiresAt),
      }),
    });

    if (error) {
      this.logger.error(
        { err: error },
        'ResendEmailSenderAdapter: invite email delivery failed',
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log('Invite email dispatched successfully');
  }

  private buildPublicInviteUrl(inviteUrl: string): string {
    const token = new URL(inviteUrl).searchParams.get('token');

    if (token === null) {
      throw new Error('Invite URL is missing token');
    }

    const url = new URL('/accept-invite', this.publicUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }
}

function daysUntil(expiresAt: Date): number {
  const diffMs = expiresAt.getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInviteHtml(opts: {
  inviteUrl: string;
  recipientName: string;
  expiresInDays: number;
}): string {
  const { inviteUrl, recipientName, expiresInDays } = opts;
  const safeInviteUrl = escapeHtml(inviteUrl);
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You have been invited to CMS</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .header { background: #18181b; padding: 32px 40px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .body { padding: 40px; }
    .body p { margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6; }
    .cta { display: block; margin: 32px 0; text-align: center; }
    .cta a {
      display: inline-block; padding: 12px 28px; background: #18181b;
      color: #ffffff !important; text-decoration: none; border-radius: 6px;
      font-size: 15px; font-weight: 500;
    }
    .note { font-size: 13px !important; color: #71717a !important; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    .footer { padding: 0 40px 32px; }
    .footer p { margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5; }
    .footer a { color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>CMS</h1></div>
    <div class="body">
      <p>${greeting}</p>
      <p>An administrator has invited you to access the CMS. Click the button below to set your password and activate your account.</p>
      <div class="cta">
        <a href="${safeInviteUrl}" target="_blank" rel="noopener noreferrer">Accept Invitation</a>
      </div>
      <p class="note">
        This link expires in ${String(expiresInDays)} day${expiresInDays !== 1 ? 's' : ''}.
        If you were not expecting this invitation, you can safely ignore this email.
      </p>
      <hr class="divider" />
      <p class="note">
        If the button above does not work, copy and paste this URL into your browser:<br />
        <a href="${safeInviteUrl}">${safeInviteUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Sent by CMS &mdash; this is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}
