-- DropForeignKey
ALTER TABLE "PublicationInteraction" DROP CONSTRAINT "PublicationInteraction_publicationId_fkey";

-- AlterTable
ALTER TABLE "PublicationInteraction" ALTER COLUMN "publicationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PublicationInteraction" ADD CONSTRAINT "PublicationInteraction_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
