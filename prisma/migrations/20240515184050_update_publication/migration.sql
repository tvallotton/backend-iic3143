/*
  Warnings:

  - You are about to drop the column `ISBN` on the `Publication` table. All the data in the column will be lost.
  - Added the required column `bookId` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Publication" DROP COLUMN "ISBN",
ADD COLUMN     "bookId" TEXT NOT NULL;
