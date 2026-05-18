import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

type ErrorResponse = {
  status(code: number): { json(body: unknown): void };
};

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<ErrorResponse>();
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after 60 seconds.',
      },
    });
  }
}
