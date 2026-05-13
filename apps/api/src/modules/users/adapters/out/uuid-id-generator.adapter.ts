import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { IdGenerator } from '../../application/ports/out/id-generator.port';

@Injectable()
export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
