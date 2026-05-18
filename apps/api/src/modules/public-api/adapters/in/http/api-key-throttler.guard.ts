import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req['headers'] as Record<string, unknown> | undefined;
    const apiKey = headers?.['x-api-key'];
    const tracker =
      typeof apiKey === 'string' && apiKey.length > 0
        ? apiKey
        : (req['ip'] as string | undefined) ?? 'unknown';

    return Promise.resolve(tracker);
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new ThrottlerException();
  }
}
