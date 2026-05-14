import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { z } from 'zod';

import { LoginUseCase } from '../../../application/ports/in/login.port';
import { Refresh } from '../../../application/use-cases/refresh';
import { Logout } from '../../../application/use-cases/logout';
import {
  AccountLockedError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidTokenError,
  RateLimitExceededError,
} from '../../../domain/errors';

const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

const acceptInviteBodySchema = z.object({
  token: z.string(),
  password: z.string(),
});

type LoginBody = z.infer<typeof loginBodySchema>;
type AcceptInviteBody = z.infer<typeof acceptInviteBodySchema>;

type AcceptInviteUseCase = {
  execute(command: AcceptInviteBody): Promise<void>;
};

type LoginRequest = {
  ip?: string;
  headers: {
    cookie?: string;
    'x-forwarded-for'?: string | string[];
  };
};

type CookieResponse = {
  cookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      path: string;
      maxAge: number;
    },
  ): void;
  clearCookie(name: string, options: { path: string }): void;
};

@Controller('api/admin/auth')
export class AuthController {
  constructor(
    @Inject('LOGIN_USE_CASE') private readonly login: LoginUseCase,
    @Inject('REFRESH_USE_CASE') private readonly refresh: Refresh,
    @Inject('LOGOUT_USE_CASE') private readonly logout: Logout,
    @Optional()
    @Inject('ACCEPT_INVITE_USE_CASE')
    private readonly acceptInvite: AcceptInviteUseCase | undefined,
  ) {}

  @Post('login')
  @HttpCode(200)
  async loginWithPassword(
    @Body() body: unknown,
    @Req() request: LoginRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }> {
    const parsed = loginBodySchema.safeParse(body);

    if (!parsed.success) {
      throw this.error(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Invalid login request',
      );
    }

    try {
      return await this.handleLogin(parsed.data, this.getActorIp(request), response);
    } catch (error) {
      throw this.mapLoginError(error);
    }
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshAccessToken(
    @Req() request: LoginRequest,
  ): Promise<{ accessToken: string }> {
    const refreshToken = this.getCookie(request, 'refreshToken');

    if (!refreshToken) {
      throw this.error(
        HttpStatus.UNAUTHORIZED,
        'INVALID_TOKEN',
        'Invalid or expired token',
      );
    }

    try {
      const result = await this.refresh.execute({
        refreshToken,
        actorIp: this.getActorIp(request),
      });

      return { accessToken: result.accessToken };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw this.error(
          HttpStatus.UNAUTHORIZED,
          'INVALID_TOKEN',
          'Invalid or expired token',
        );
      }

      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logoutWithRefreshToken(
    @Req() request: LoginRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    const refreshToken = this.getCookie(request, 'refreshToken');

    if (!refreshToken) {
      return;
    }

    await this.logout.execute({
      refreshToken,
      actorIp: this.getActorIp(request),
    });
    response.clearCookie('refreshToken', { path: '/' });
  }

  @Post('accept-invite')
  @HttpCode(204)
  async acceptInviteWithPassword(@Body() body: unknown): Promise<void> {
    const parsed = acceptInviteBodySchema.safeParse(body);

    if (!parsed.success) {
      throw this.error(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR',
        'Invalid body',
      );
    }

    try {
      if (this.acceptInvite === undefined) {
        throw this.error(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'INTERNAL_ERROR',
          'Internal server error',
        );
      }

      await this.acceptInvite.execute(parsed.data);
    } catch (error) {
      throw this.mapAcceptInviteError(error);
    }
  }

  private async handleLogin(
    body: LoginBody,
    actorIp: string,
    response: CookieResponse,
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }> {
    const result = await this.login.execute({
      ...body,
      actorIp,
    });

    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  private getActorIp(request: LoginRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const firstForwardedFor = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

    return firstForwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';
  }

  private mapLoginError(error: unknown): HttpException {
    if (error instanceof InvalidCredentialsError) {
      return this.error(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Invalid credentials',
      );
    }

    if (error instanceof AccountLockedError) {
      return this.error(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Invalid credentials',
      );
    }

    if (error instanceof InvalidEmailError) {
      return this.error(HttpStatus.BAD_REQUEST, 'INVALID_EMAIL', 'Invalid email');
    }

    if (error instanceof RateLimitExceededError) {
      return this.error(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT_EXCEEDED',
        'Too many login attempts',
      );
    }

    throw error;
  }

  private mapAcceptInviteError(error: unknown): HttpException {
    if (this.hasName(error, 'UserNotFoundError')) {
      return this.error(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    if (this.hasName(error, 'InviteExpiredError')) {
      return this.error(HttpStatus.GONE, 'INVITE_EXPIRED', 'Invite has expired');
    }

    if (this.hasName(error, 'InvalidTransitionError')) {
      return this.error(
        HttpStatus.CONFLICT,
        'INVALID_TRANSITION',
        'Invalid transition',
      );
    }

    if (this.hasName(error, 'WeakPasswordError')) {
      return this.error(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'WEAK_PASSWORD',
        'Password must be at least 12 characters and contain at least one letter and one digit',
      );
    }

    return this.error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Internal server error',
    );
  }

  private hasName(error: unknown, name: string): boolean {
    return error instanceof Error && error.name === name;
  }

  private error(status: HttpStatus, code: string, message: string): HttpException {
    return new HttpException({ error: { code, message } }, status);
  }

  private getCookie(request: LoginRequest, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const prefix = `${name}=`;
    const cookie = cookies.find((candidate) => candidate.startsWith(prefix));

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
  }
}
