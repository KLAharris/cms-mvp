import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { jwtVerify } from 'jose';

export type AuthenticatedUser = {
  userId: string;
  role: string;
};

type RequestWithUser = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret: Uint8Array;

  constructor(@Inject('JWT_SECRET') jwtSecret: string) {
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.getBearerToken(request.headers.authorization);

    if (token === null) {
      throw new UnauthorizedException();
    }

    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      });
      const role = payload.role;

      if (typeof payload.sub !== 'string' || typeof role !== 'string') {
        throw new UnauthorizedException();
      }

      request.user = {
        userId: payload.sub,
        role,
      };

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private getBearerToken(authorization: string | undefined): string | null {
    if (authorization === undefined) {
      return null;
    }

    const [scheme, token, extra] = authorization.split(' ');

    if (scheme !== 'Bearer' || token === undefined || token === '' || extra !== undefined) {
      return null;
    }

    return token;
  }
}
