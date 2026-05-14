import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ContentForbiddenError } from '../../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../../domain/errors/content-not-found.error';
import { InvalidTransitionError } from '../../../domain/errors/invalid-transition.error';
import { PublishValidationError } from '../../../domain/errors/publish-validation.error';
import { ScheduledAtInPastError } from '../../../domain/errors/scheduled-at-in-past.error';
import { SlugConflictError } from '../../../domain/errors/slug-conflict.error';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { ContentDomainExceptionFilter } from './content-domain-exception.filter';

function host() {
  const captured: { status?: number; body?: object } = {};
  const argumentsHost = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (status: number) => ({
          json: (body: object) => {
            captured.status = status;
            captured.body = body;
          },
        }),
      }),
    }),
  } as ArgumentsHost;

  return { captured, argumentsHost };
}

describe('ContentDomainExceptionFilter', () => {
  it.each([
    [new ContentNotFoundError('id'), HttpStatus.NOT_FOUND, 'CONTENT_NOT_FOUND'],
    [
      new InvalidTransitionError(ContentStatus.Draft, ContentStatus.Archived),
      HttpStatus.CONFLICT,
      'INVALID_TRANSITION',
    ],
    [new SlugConflictError(ContentType.Article, 'slug'), HttpStatus.CONFLICT, 'SLUG_CONFLICT'],
    [
      new PublishValidationError('Invalid'),
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PUBLISH_VALIDATION_ERROR',
    ],
    [new ContentForbiddenError('No'), HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    [
      new ScheduledAtInPastError(),
      HttpStatus.UNPROCESSABLE_ENTITY,
      'SCHEDULED_AT_IN_PAST',
    ],
  ])('maps %s', (error, status, code) => {
    const setup = host();

    new ContentDomainExceptionFilter().catch(error, setup.argumentsHost);

    expect(setup.captured.status).toBe(status);
    expect(setup.captured.body).toMatchObject({ error: { code } });
  });

  it('passes through HttpException envelopes', () => {
    const setup = host();

    new ContentDomainExceptionFilter().catch(
      new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'Invalid' } }),
      setup.argumentsHost,
    );

    expect(setup.captured.status).toBe(400);
    expect(setup.captured.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('maps HttpException responses without envelopes', () => {
    const unauthorized = host();
    const badRequest = host();

    new ContentDomainExceptionFilter().catch(
      new UnauthorizedException(),
      unauthorized.argumentsHost,
    );
    new ContentDomainExceptionFilter().catch(
      new BadRequestException('Bad input'),
      badRequest.argumentsHost,
    );

    expect(unauthorized.captured.body).toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
    expect(badRequest.captured.body).toMatchObject({
      error: { code: 'HTTP_ERROR' },
    });
  });

  it('rethrows unknown errors', () => {
    expect(() =>
      new ContentDomainExceptionFilter().catch(new Error('unknown'), host().argumentsHost),
    ).toThrow('unknown');
  });
});
