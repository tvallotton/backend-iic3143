/*
  Warnings:

  - A unique constraint covering the columns `[publicationId,userId]` on the table `PublicationInteraction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PublicationInteraction_publicationId_userId_key" ON "PublicationInteraction"("publicationId", "userId");
