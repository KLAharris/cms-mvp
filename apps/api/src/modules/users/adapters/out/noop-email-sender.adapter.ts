import { Injectable, Logger } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { EmailSender, SendInviteOptions } from '../../application/ports/out/email-sender.port';

@Injectable()
export class NoopEmailSender implements EmailSender {
  private readonly fallbackLogger = new Logger(NoopEmailSender.name);

  constructor(
    @InjectPinoLogger(NoopEmailSender.name) private readonly logger?: PinoLogger,
  ) {}

  sendInvite(params: SendInviteOptions): Promise<void> {
    const meta = { expiresAt: params.expiresAt.toISOString() };

    if (this.logger) {
      this.logger.info(meta, 'User invite email noop');
    } else {
      this.fallbackLogger.log('User invite email noop');
    }

    return Promise.resolve();
  }
}
