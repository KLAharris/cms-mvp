import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const apiKey = req.headers?.['x-api-key'];
    return typeof apiKey === 'string' && apiKey.length > 0
      ? apiKey
      : req.ip ?? 'unknown';
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException();
  }
}
