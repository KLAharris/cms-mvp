import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { ContentController } from './adapters/in/http/content.controller';
import {
  CONTENT_REPOSITORY,
  CONTENT_VERSION_REPOSITORY,
  ContentModule,
} from './content.module';

describe('ContentModule', () => {
  it('declares the content controller and repository tokens', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ContentModule,
    ) as object[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ContentModule,
    ) as object[];

    expect(controllers).toContain(ContentController);
    expect(exports).toContain(CONTENT_REPOSITORY);
    expect(exports).toContain(CONTENT_VERSION_REPOSITORY);
  });
});
