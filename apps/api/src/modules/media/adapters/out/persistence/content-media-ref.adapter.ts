import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import { MediaReferenceChecker } from '../../../application/ports/out';
import { MediaId } from '../../../domain/value-objects';

@Injectable()
export class ContentMediaRefAdapter implements MediaReferenceChecker {
  constructor(private readonly prisma: PrismaService) {}

  async countReferences(mediaId: MediaId): Promise<number> {
    const [embedCount, featuredCount, socialCount] = await Promise.all([
      this.prisma.contentMediaRef.count({
        where: {
          mediaItemId: mediaId.value,
          content: { deletedAt: null },
        },
      }),
      this.prisma.content.count({
        where: {
          featuredImageId: mediaId.value,
          deletedAt: null,
        },
      }),
      this.prisma.content.count({
        where: {
          socialImageId: mediaId.value,
          deletedAt: null,
        },
      }),
    ]);

    return embedCount + featuredCount + socialCount;
  }
}
