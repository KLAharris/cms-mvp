import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
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

type LoginBody = z.infer<typeof loginBodySchema>;

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
      throw new HttpException({ message: 'Invalid login request' }, HttpStatus.BAD_REQUEST);
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
      throw new HttpException({ message: 'Invalid or expired token' }, HttpStatus.UNAUTHORIZED);
    }

    try {
      const result = await this.refresh.execute({
        refreshToken,
        actorIp: this.getActorIp(request),
      });

      return { accessToken: result.accessToken };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new HttpException(
          { message: 'Invalid or expired token' },
          HttpStatus.UNAUTHORIZED,
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
      secure: false,
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
      return new HttpException({ message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    if (error instanceof AccountLockedError) {
      return new HttpException({ message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    if (error instanceof InvalidEmailError) {
      return new HttpException({ message: 'Invalid email' }, HttpStatus.BAD_REQUEST);
    }

    if (error instanceof RateLimitExceededError) {
      return new HttpException({ message: 'Too many login attempts' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    throw error;
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
