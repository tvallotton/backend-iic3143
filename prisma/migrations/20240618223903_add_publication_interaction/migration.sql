-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('VIEWED', 'COMPLETED');

-- CreateTable
CREATE TABLE "PublicationInteraction" (
    "id" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InteractionStatus" NOT NULL DEFAULT 'VIEWED',

    CONSTRAINT "PublicationInteraction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PublicationInteraction" ADD CONSTRAINT "PublicationInteraction_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationInteraction" ADD CONSTRAINT "PublicationInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
