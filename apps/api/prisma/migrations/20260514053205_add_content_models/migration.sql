-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('article', 'page');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'in_review', 'published', 'unpublished', 'archived');

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "author_id" TEXT NOT NULL,
    "featured_image_id" TEXT,
    "social_image_id" TEXT,
    "seo_title" TEXT NOT NULL DEFAULT '',
    "seo_description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "category" TEXT,
    "parent_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_version" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_status_published_at_idx" ON "content"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "content_author_id_status_idx" ON "content"("author_id", "status");

-- CreateIndex
CREATE INDEX content_tags_gin_idx ON content USING GIN (tags);

-- CreateIndex
CREATE UNIQUE INDEX "content_type_slug_key" ON "content"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_version_content_id_version_no_key" ON "content_version"("content_id", "version_no");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_version" ADD CONSTRAINT "content_version_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
