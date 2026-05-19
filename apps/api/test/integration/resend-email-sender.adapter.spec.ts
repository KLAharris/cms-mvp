import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResendEmailSenderAdapter } from '../../src/modules/notification/adapters/out/email/resend-email-sender.adapter';

const send = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send },
  })),
}));

function config(): ConfigService {
  return {
    getOrThrow: (key: string): string => {
      const values: Record<string, string> = {
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_ADDRESS: 'CMS <no-reply@example.com>',
      };
      const value = values[key];

      if (value === undefined) {
        throw new Error(`Missing test config key: ${key}`);
      }

      return value;
    },
  } as ConfigService;
}

describe('ResendEmailSenderAdapter', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('sends password reset email payload through Resend', async () => {
    const adapter = new ResendEmailSenderAdapter(config());

    await adapter.sendPasswordResetEmail(
      'user@example.com',
      'https://admin.example.com/reset-password?token=token',
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'CMS <no-reply@example.com>',
        to: 'user@example.com',
        subject: 'Reset your password',
        html: expect.stringContaining(
          'https://admin.example.com/reset-password?token=token',
        ),
      }),
    );
  });

  it('sends invite email payload through Resend', async () => {
    const adapter = new ResendEmailSenderAdapter(config());

    await adapter.sendInviteEmail(
      'author@example.com',
      'https://admin.example.com/accept-invite?token=token',
      'author',
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'CMS <no-reply@example.com>',
        to: 'author@example.com',
        subject: "You've been invited",
        html: expect.stringContaining(
          'https://admin.example.com/accept-invite?token=token',
        ),
      }),
    );
    const payload = send.mock.calls[0]?.[0] as { html: string } | undefined;
    expect(payload?.html).toContain('author');
  });

  it('propagates Resend send errors', async () => {
    send.mockRejectedValue(new Error('resend unavailable'));
    const adapter = new ResendEmailSenderAdapter(config());

    await expect(
      adapter.sendInviteEmail(
        'author@example.com',
        'https://admin.example.com/accept-invite?token=token',
        'author',
      ),
    ).rejects.toThrow('resend unavailable');
  });

  it('does not require Resend config until an email is sent', async () => {
    const missingConfig = {
      getOrThrow: (key: string): string => {
        throw new Error(`Missing config key: ${key}`);
      },
    } as ConfigService;

    const adapter = new ResendEmailSenderAdapter(missingConfig);

    await expect(
      adapter.sendPasswordResetEmail('user@example.com', 'https://example.com/reset'),
    ).rejects.toThrow('Missing config key: RESEND_API_KEY');
  });
});
