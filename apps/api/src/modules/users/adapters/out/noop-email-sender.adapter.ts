import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { EmailSender } from '../../application/ports/out/email-sender.port';

@Injectable()
export class NoopEmailSender implements EmailSender {
  constructor(
    @InjectPinoLogger(NoopEmailSender.name) private readonly logger: PinoLogger,
  ) {}

  sendInvite(params: {
    to: string;
    name: string;
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    this.logger.info({ invite: params }, 'User invite email noop');
    return Promise.resolve();
  }
}
