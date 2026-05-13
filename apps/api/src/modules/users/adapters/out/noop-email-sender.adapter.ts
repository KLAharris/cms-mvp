import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { EmailSender } from '../../application/ports/out/email-sender.port';

@Injectable()
export class NoopEmailSender implements EmailSender {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(NoopEmailSender.name);
  }

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
