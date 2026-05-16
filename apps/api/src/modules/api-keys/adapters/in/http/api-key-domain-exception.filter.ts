import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import {
  ApiKeyAlreadyRevokedError,
  ApiKeyInvalidError,
  ApiKeyNotFoundError,
} from '../../../domain/errors';

type ResponseLike = {
  status(statusCode: number): {
    json(body: ErrorEnvelope): void;
  };
};

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
};

@Catch()
export class ApiKeyDomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ResponseLike>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const errorBody =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'object' &&
        body.error !== null
          ? (body as ErrorEnvelope)
          : {
              error: {
                code:
                  exception.getStatus() === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
                message: exception.message,
              },
            };

      response.status(exception.getStatus()).json(errorBody);
      return;
    }

    const mapped = this.map(exception);
    if (mapped === null) {
      throw exception;
    }

    response.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
      },
    });
  }

  private map(
    exception: unknown,
  ): { status: HttpStatus; code: string; message: string } | null {
    if (exception instanceof ApiKeyNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ApiKeyAlreadyRevokedError) {
      return {
        status: HttpStatus.CONFLICT,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ApiKeyInvalidError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: exception.code,
        message: exception.message,
      };
    }

    return null;
  }
}
