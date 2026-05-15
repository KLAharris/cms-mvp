import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MediaReferenceChecker } from '../../../application/ports/out';
import { MediaId } from '../../../domain/value-objects';

type PrismaMediaReferenceClient = {
  contentMediaRef: {
    count(args: Prisma.ContentMediaRefCountArgs): Promise<number>;
  };
  content: {
    count(args: Prisma.ContentCountArgs): Promise<number>;
  };
};

@Injectable()
export class ContentMediaRefAdapter implements MediaReferenceChecker {
  constructor(private readonly prisma: PrismaMediaReferenceClient) {}

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
