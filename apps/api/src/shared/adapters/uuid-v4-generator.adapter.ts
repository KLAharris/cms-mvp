import { randomUUID } from 'crypto';

import { IdGenerator } from '../ports/id-generator.port';

export class UuidV4Generator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
