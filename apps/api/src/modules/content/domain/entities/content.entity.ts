import { ContentDeleted } from '../events/content-deleted.event';
import { DomainEvent } from '../events/domain-event';
import { ContentPublished } from '../events/content-published.event';
import { ContentUnpublished } from '../events/content-unpublished.event';
import { InvalidTransitionError } from '../errors/invalid-transition.error';
import { ScheduledAtInPastError } from '../errors/scheduled-at-in-past.error';
import { ContentLifecycleService } from '../services/content-lifecycle.service';
import { ContentId } from '../value-objects/content-id.vo';
import { ContentStatus } from '../value-objects/content-status.vo';
import { ContentType } from '../value-objects/content-type.vo';
import { RichTextBody } from '../value-objects/rich-text-body.vo';
import { SeoMetadata } from '../value-objects/seo-metadata.vo';
import { Slug } from '../value-objects/slug.vo';
import { Tag } from '../value-objects/tag.vo';

export type ContentCreateProps = {
  id: ContentId;
  type: ContentType;
  title: string;
  slug: Slug;
  authorId: string;
  seoMetadata: SeoMetadata;
  createdAt: Date;
};

export type ContentReconstituteProps = ContentCreateProps & {
  body: RichTextBody | null;
  status: ContentStatus;
  featuredImageId: string | null;
  socialImageId: string | null;
  tags: Tag[];
  category: string | null;
  parentId: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
};

export type ContentUpdateFields = Partial<{
  title: string;
  slug: Slug;
  body: RichTextBody | null;
  featuredImageId: string | null;
  socialImageId: string | null;
  seoMetadata: SeoMetadata;
  tags: Tag[];
  category: string | null;
  parentId: string | null;
  scheduledAt: Date | null;
}>;

export type ContentSnapshot = ContentUpdateFields & {
  title: string;
  slug: Slug;
  body: RichTextBody | null;
  featuredImageId: string | null;
  socialImageId: string | null;
  seoMetadata: SeoMetadata;
  tags: Tag[];
  category: string | null;
  parentId: string | null;
  scheduledAt: Date | null;
};

export class Content {
  readonly id: ContentId;
  type: ContentType;
  title: string;
  slug: Slug;
  body: RichTextBody | null;
  status: ContentStatus;
  readonly authorId: string;
  featuredImageId: string | null;
  socialImageId: string | null;
  seoMetadata: SeoMetadata;
  tags: Tag[];
  category: string | null;
  parentId: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
  private _domainEvents: DomainEvent[];

  private constructor(props: ContentReconstituteProps, events: DomainEvent[] = []) {
    this.id = props.id;
    this.type = props.type;
    this.title = props.title;
    this.slug = props.slug;
    this.body = props.body;
    this.status = props.status;
    this.authorId = props.authorId;
    this.featuredImageId = props.featuredImageId;
    this.socialImageId = props.socialImageId;
    this.seoMetadata = props.seoMetadata;
    this.tags = props.tags;
    this.category = props.category;
    this.parentId = props.parentId;
    this.scheduledAt = props.scheduledAt;
    this.publishedAt = props.publishedAt;
    this.deletedAt = props.deletedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this._domainEvents = events;
  }

  static create(props: ContentCreateProps): Content {
    return new Content({
      ...props,
      body: null,
      status: ContentStatus.Draft,
      featuredImageId: null,
      socialImageId: null,
      tags: [],
      category: null,
      parentId: null,
      scheduledAt: null,
      publishedAt: null,
      deletedAt: null,
      updatedAt: props.createdAt,
    });
  }

  static reconstitute(props: ContentReconstituteProps): Content {
    return new Content(props);
  }

  submit(_actorId: string, now: Date): void {
    if (
      this.status === ContentStatus.Draft ||
      this.status === ContentStatus.Unpublished
    ) {
      this.status = ContentStatus.InReview;
      this.updatedAt = now;
      return;
    }

    throw new InvalidTransitionError(this.status, ContentStatus.InReview);
  }

  publish(actorId: string, now: Date): void {
    ContentLifecycleService.assertCanTransition(
      this.status,
      ContentStatus.Published,
    );
    this.status = ContentStatus.Published;
    if (this.publishedAt === null) {
      this.publishedAt = now;
    }
    this.updatedAt = now;
    this._domainEvents.push(new ContentPublished(this.id, this.publishedAt, actorId));
  }

  reject(_actorId: string, now: Date): void {
    if (this.status !== ContentStatus.InReview) {
      throw new InvalidTransitionError(this.status, ContentStatus.Draft);
    }

    this.status = ContentStatus.Draft;
    this.updatedAt = now;
  }

  unpublish(actorId: string, now: Date): void {
    ContentLifecycleService.assertCanTransition(
      this.status,
      ContentStatus.Unpublished,
    );
    this.status = ContentStatus.Unpublished;
    this.updatedAt = now;
    this._domainEvents.push(new ContentUnpublished(this.id, actorId, now));
  }

  archive(_actorId: string, now: Date): void {
    ContentLifecycleService.assertCanTransition(
      this.status,
      ContentStatus.Archived,
    );
    this.status = ContentStatus.Archived;
    this.updatedAt = now;
  }

  softDelete(actorId: string, now: Date): void {
    if (this.deletedAt !== null) {
      throw new InvalidTransitionError(this.status, this.status);
    }

    this.deletedAt = now;
    this.updatedAt = now;
    this._domainEvents.push(new ContentDeleted(this.id, actorId, now));
  }

  schedulePublish(scheduledAt: Date, _actorId: string, now: Date): void {
    if (scheduledAt.getTime() <= now.getTime()) {
      throw new ScheduledAtInPastError();
    }

    if (
      this.status !== ContentStatus.Draft &&
      this.status !== ContentStatus.InReview
    ) {
      throw new InvalidTransitionError(this.status, this.status);
    }

    this.scheduledAt = scheduledAt;
    this.updatedAt = now;
  }

  update(fields: ContentUpdateFields, now: Date): void {
    if (
      this.status !== ContentStatus.Draft &&
      this.status !== ContentStatus.Unpublished
    ) {
      throw new InvalidTransitionError(this.status, this.status);
    }

    this.assign(fields);
    this.updatedAt = now;
  }

  applyVersionSnapshot(
    snapshot: ContentSnapshot,
    _editorId: string,
    now: Date,
  ): void {
    if (
      this.status !== ContentStatus.Draft &&
      this.status !== ContentStatus.Unpublished
    ) {
      throw new InvalidTransitionError(this.status, this.status);
    }

    this.assign(snapshot);
    this.updatedAt = now;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private assign(fields: ContentUpdateFields): void {
    if (fields.title !== undefined) this.title = fields.title;
    if (fields.slug !== undefined) this.slug = fields.slug;
    if (fields.body !== undefined) this.body = fields.body;
    if (fields.featuredImageId !== undefined) {
      this.featuredImageId = fields.featuredImageId;
    }
    if (fields.socialImageId !== undefined) this.socialImageId = fields.socialImageId;
    if (fields.seoMetadata !== undefined) this.seoMetadata = fields.seoMetadata;
    if (fields.tags !== undefined) this.tags = fields.tags;
    if (fields.category !== undefined) this.category = fields.category;
    if (fields.parentId !== undefined) this.parentId = fields.parentId;
    if (fields.scheduledAt !== undefined) this.scheduledAt = fields.scheduledAt;
  }
}
