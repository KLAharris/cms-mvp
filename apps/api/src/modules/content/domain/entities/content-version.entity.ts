import { ContentId } from '../value-objects/content-id.vo';

export type ContentVersionProps = {
  id: string;
  contentId: ContentId;
  versionNo: number;
  snapshot: object;
  editorId: string;
  createdAt: Date;
};

export class ContentVersion {
  readonly id: string;
  readonly contentId: ContentId;
  readonly versionNo: number;
  readonly snapshot: object;
  readonly editorId: string;
  readonly createdAt: Date;

  private constructor(props: ContentVersionProps) {
    this.id = props.id;
    this.contentId = props.contentId;
    this.versionNo = props.versionNo;
    this.snapshot = props.snapshot;
    this.editorId = props.editorId;
    this.createdAt = props.createdAt;
  }

  static create(props: ContentVersionProps): ContentVersion {
    return new ContentVersion(props);
  }
}
