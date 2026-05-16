export type ApiKeyResponse = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdById: string;
  createdAt: string;
};
