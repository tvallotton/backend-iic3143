-- DropForeignKey
ALTER TABLE "PublicationInteraction" DROP CONSTRAINT "PublicationInteraction_publicationId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_publicationId_fkey";

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "publicationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationInteraction" ADD CONSTRAINT "PublicationInteraction_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
