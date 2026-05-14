import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ContentForbiddenError } from '../../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../../domain/errors/invalid-transition.error';
import { PublishValidationError } from '../../../domain/errors/publish-validation.error';
import { ScheduledAtInPastError } from '../../../domain/errors/scheduled-at-in-past.error';
import { SlugConflictError } from '../../../domain/errors/slug-conflict.error';
import { InvalidContentIdError } from '../../../domain/value-objects/content-id.vo';

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
export class ContentDomainExceptionFilter implements ExceptionFilter {
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
                  exception.getStatus() === HttpStatus.UNAUTHORIZED
                    ? 'UNAUTHORIZED'
                    : 'HTTP_ERROR',
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
    if (exception instanceof InvalidContentIdError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_CONTENT_ID',
        message: exception.message,
      };
    }

    if (exception instanceof ContentNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'CONTENT_NOT_FOUND',
        message: exception.message,
      };
    }

    if (exception instanceof InvalidTransitionError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'INVALID_TRANSITION',
        message: exception.message,
      };
    }

    if (exception instanceof SlugConflictError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'SLUG_CONFLICT',
        message: exception.message,
      };
    }

    if (exception instanceof PublishValidationError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'PUBLISH_VALIDATION_ERROR',
        message: exception.message,
      };
    }

    if (exception instanceof ContentForbiddenError) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: 'FORBIDDEN',
        message: exception.message,
      };
    }

    if (exception instanceof ScheduledAtInPastError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'SCHEDULED_AT_IN_PAST',
        message: exception.message,
      };
    }

    return null;
  }
}
