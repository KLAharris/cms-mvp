import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { LOOKUP_API_KEY } from '../../../application/ports/tokens';
import { ILookupApiKey } from '../../../application/ports/in';
import { ApiKey } from '../../../domain/entities';
import { ApiKeyInvalidError } from '../../../domain/errors';

type RequestWithApiKey = {
  headers: {
    'x-api-key'?: string | string[];
  };
  apiKey?: ApiKey;
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(LOOKUP_API_KEY)
    private readonly lookupApiKey: ILookupApiKey,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const rawKey = this.getRawKey(request.headers['x-api-key']);

    if (rawKey === null) {
      throw new UnauthorizedException();
    }

    try {
      request.apiKey = await this.lookupApiKey.execute({ rawKey });
      return true;
    } catch (error) {
      if (error instanceof ApiKeyInvalidError) {
        throw new UnauthorizedException();
      }

      throw error;
    }
  }

  private getRawKey(value: string | string[] | undefined): string | null {
    const rawKey = Array.isArray(value) ? value[0] : value;

    if (rawKey === undefined || rawKey.trim() === '') {
      return null;
    }

    return rawKey;
  }
}
