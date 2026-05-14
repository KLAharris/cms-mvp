export interface ListVersionsUseCase {
  execute(command: ListVersionsCommand): Promise<ListVersionsResult>;
}

export type ListVersionsCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
};

export type ListVersionsResult = {
  versions: VersionSummary[];
};

export type VersionSummary = {
  versionNo: number;
  editorId: string;
  createdAt: Date;
};
