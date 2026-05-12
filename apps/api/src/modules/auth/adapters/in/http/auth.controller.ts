import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import { z } from 'zod';

import { LoginUseCase } from '../../../application/ports/in/login.port';
import {
  AccountLockedError,
  InvalidCredentialsError,
  InvalidEmailError,
} from '../../../domain/errors';

const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

type LoginBody = z.infer<typeof loginBodySchema>;

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
};

@Controller('api/admin/auth')
export class AuthController {
  constructor(@Inject('LOGIN_USE_CASE') private readonly login: LoginUseCase) {}

  @Post('login')
  @HttpCode(200)
  async loginWithPassword(
    @Body() body: unknown,
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
      return await this.handleLogin(parsed.data, response);
    } catch (error) {
      throw this.mapLoginError(error);
    }
  }

  private async handleLogin(
    body: LoginBody,
    response: CookieResponse,
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }> {
    const result = await this.login.execute(body);

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

  private mapLoginError(error: unknown): HttpException {
    if (error instanceof InvalidCredentialsError) {
      return new HttpException({ message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    if (error instanceof AccountLockedError) {
      return new HttpException({ message: 'Account is locked' }, 423);
    }

    if (error instanceof InvalidEmailError) {
      return new HttpException({ message: 'Invalid email' }, HttpStatus.BAD_REQUEST);
    }

    throw error;
  }
}
