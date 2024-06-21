/*
  Warnings:

  - You are about to drop the column `reviewdUserId` on the `Review` table. All the data in the column will be lost.
  - Added the required column `reviewedUserId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_reviewdUserId_fkey";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "reviewdUserId",
ADD COLUMN     "reviewedUserId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedUserId_fkey" FOREIGN KEY ("reviewedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
