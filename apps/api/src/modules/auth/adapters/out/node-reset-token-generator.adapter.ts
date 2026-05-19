import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { ResetTokenGenerator } from '../../application/ports/out/reset-token-generator.port';

@Injectable()
export class NodeResetTokenGenerator implements ResetTokenGenerator {
  generate(): string {
    return randomBytes(32).toString('hex');
  }
}
