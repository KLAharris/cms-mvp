import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req['headers'] as Record<string, unknown> | undefined;
    const apiKey = headers?.['x-api-key'];
    const ip = req['ip'] as string | undefined;
    const tracker =
      typeof apiKey === 'string' && apiKey.length > 0
        ? apiKey
        : (ip ?? 'unknown');
    return Promise.resolve(tracker);
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new ThrottlerException();
  }
}
