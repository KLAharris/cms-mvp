/*
  Warnings:

  - You are about to drop the column `createdAt` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `keyHash` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `lastUsedAt` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `api_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key_hash]` on the table `api_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by_id` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key_hash` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_createdById_fkey";

-- DropIndex
DROP INDEX "api_keys_keyHash_key";

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "keyHash",
DROP COLUMN "lastUsedAt",
DROP COLUMN "revokedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "key_hash" TEXT NOT NULL,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
