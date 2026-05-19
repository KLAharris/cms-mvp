import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthController } from '../../../../adapters/in/http/auth.controller';
import { InvalidResetTokenError } from '../../../../domain/errors';

describe('AuthController password reset endpoints', () => {
  let app: INestApplication;
  const requestPasswordReset = {
    calls: [] as Array<{ email: string }>,
    execute(command: { email: string }): Promise<void> {
      this.calls.push(command);
      return Promise.resolve();
    },
  };
  const resetPassword = {
    error: undefined as Error | undefined,
    calls: [] as Array<{ token: string; password: string }>,
    execute(command: { token: string; password: string }): Promise<void> {
      this.calls.push(command);

      if (this.error) {
        return Promise.reject(this.error);
      }

      return Promise.resolve();
    },
  };

  beforeEach(async () => {
    requestPasswordReset.calls = [];
    resetPassword.calls = [];
    resetPassword.error = undefined;

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60 * 60 * 1000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        { provide: 'LOGIN_USE_CASE', useValue: { execute: () => Promise.resolve() } },
        { provide: 'REFRESH_USE_CASE', useValue: { execute: () => Promise.resolve() } },
        { provide: 'LOGOUT_USE_CASE', useValue: { execute: () => Promise.resolve() } },
        {
          provide: 'REQUEST_PASSWORD_RESET_USE_CASE',
          useValue: requestPasswordReset,
        },
        { provide: 'RESET_PASSWORD_USE_CASE', useValue: resetPassword },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/admin/auth/forgot-password always returns the enumeration-safe message', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/admin/auth/forgot-password')
      .send({ email: 'editor@example.com' })
      .expect(200)
      .expect({
        message: 'If that email exists you will receive a reset link',
      });

    expect(requestPasswordReset.calls).toEqual([{ email: 'editor@example.com' }]);
  });

  it('POST /api/admin/auth/forgot-password does not expose invalid email validation', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/admin/auth/forgot-password')
      .send({ email: 'not-an-email' })
      .expect(200)
      .expect({
        message: 'If that email exists you will receive a reset link',
      });

    expect(requestPasswordReset.calls).toEqual([]);
  });

  it('POST /api/admin/auth/reset-password returns 200 on success', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/admin/auth/reset-password')
      .send({ token: 'raw-token', password: 'new-password1' })
      .expect(200);

    expect(resetPassword.calls).toEqual([
      { token: 'raw-token', password: 'new-password1' },
    ]);
  });

  it('POST /api/admin/auth/reset-password maps invalid tokens to INVALID_RESET_TOKEN', async () => {
    resetPassword.error = new InvalidResetTokenError();

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/admin/auth/reset-password')
      .send({ token: 'raw-token', password: 'new-password1' })
      .expect(400)
      .expect({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired password reset token',
        },
      });
  });
});
