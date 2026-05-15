-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "variants" JSONB,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media_refs" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "media_item_id" TEXT NOT NULL,

    CONSTRAINT "content_media_refs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_items_storage_key_key" ON "media_items"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "content_media_refs_content_id_media_item_id_key" ON "content_media_refs"("content_id", "media_item_id");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_featured_image_id_fkey" FOREIGN KEY ("featured_image_id") REFERENCES "media_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_social_image_id_fkey" FOREIGN KEY ("social_image_id") REFERENCES "media_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media_refs" ADD CONSTRAINT "content_media_refs_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media_refs" ADD CONSTRAINT "content_media_refs_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
