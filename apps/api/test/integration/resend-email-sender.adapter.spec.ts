import { ConfigService } from '@nestjs/config';
import { beforeAll, describe, expect, it } from 'vitest';

import { ResendEmailSenderAdapter } from '../../src/modules/users/adapters/out/email/resend-email-sender.adapter';

const hasKey = !!process.env.RESEND_API_KEY;

describe.skipIf(!hasKey)('ResendEmailSenderAdapter (live Resend API)', () => {
  let adapter: ResendEmailSenderAdapter;

  beforeAll(() => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for live Resend adapter tests');
    }

    const config = {
      getOrThrow: (key: string) => {
        const map: Record<string, string> = {
          RESEND_API_KEY: apiKey,
          EMAIL_FROM: process.env.EMAIL_FROM ?? 'no-reply@cms.example.com',
          EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? 'CMS',
          PUBLIC_URL: process.env.PUBLIC_URL ?? 'http://localhost:5173',
        };

        if (!map[key]) {
          throw new Error(`Missing config key in test stub: ${key}`);
        }

        return map[key];
      },
    } as unknown as ConfigService;

    adapter = new ResendEmailSenderAdapter(config);
  });

  it('delivers an invite email without throwing', async () => {
    await expect(
      adapter.sendInvite({
        to: 'delivered@resend.dev',
        name: 'Test User',
        inviteUrl: 'http://localhost:5173/accept-invite?token=test-token-abc123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    ).resolves.not.toThrow();
  });

  it('throws with "Email delivery failed" when the API key is invalid', async () => {
    const badConfig = {
      getOrThrow: (key: string) => {
        const map: Record<string, string> = {
          RESEND_API_KEY: 're_invalid_key_xxxxx',
          EMAIL_FROM: 'no-reply@cms.example.com',
          EMAIL_FROM_NAME: 'CMS',
          PUBLIC_URL: 'http://localhost:5173',
        };

        if (!map[key]) {
          throw new Error(`Missing config key in test stub: ${key}`);
        }

        return map[key];
      },
    } as unknown as ConfigService;

    const badAdapter = new ResendEmailSenderAdapter(badConfig);
    await expect(
      badAdapter.sendInvite({
        to: 'delivered@resend.dev',
        name: 'Test User',
        inviteUrl: 'http://localhost:5173/accept-invite?token=token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    ).rejects.toThrow(/Email delivery failed/);
  });
});
