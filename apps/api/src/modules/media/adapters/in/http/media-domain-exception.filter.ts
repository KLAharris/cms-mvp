import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import {
  FileSizeLimitExceededError,
  MediaAlreadyFinalizedError,
  MediaForbiddenError,
  MediaNotFoundError,
  MediaReferencedError,
  UnsupportedMediaTypeError,
  VariantGenerationFailedError,
} from '../../../domain/errors';
import { InvalidMediaIdError } from '../../../domain/value-objects/media-id';

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
export class MediaDomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ResponseLike>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const errorBody =
        typeof body === 'object' &&
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
    if (exception instanceof InvalidMediaIdError || exception instanceof MediaNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'MEDIA_NOT_FOUND',
        message: exception.message,
      };
    }

    if (exception instanceof MediaReferencedError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'MEDIA_REFERENCED',
        message: exception.message,
      };
    }

    if (exception instanceof UnsupportedMediaTypeError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: exception.message,
      };
    }

    if (exception instanceof FileSizeLimitExceededError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'FILE_SIZE_LIMIT_EXCEEDED',
        message: exception.message,
      };
    }

    if (exception instanceof MediaAlreadyFinalizedError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'MEDIA_ALREADY_FINALIZED',
        message: exception.message,
      };
    }

    if (exception instanceof VariantGenerationFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'VARIANT_GENERATION_FAILED',
        message: exception.message,
      };
    }

    if (exception instanceof MediaForbiddenError) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: 'MEDIA_FORBIDDEN',
        message: exception.message,
      };
    }

    return null;
  }
}
