type VariantUrl = {
  url: string;
  expiresAt: string;
};

export type MediaItemResponse = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  width?: number;
  height?: number;
  requiresSanitization: boolean;
  variants: {
    original?: VariantUrl;
    thumbnail?: VariantUrl;
    medium?: VariantUrl;
  };
};
