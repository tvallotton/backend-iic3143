/*
  Warnings:

  - You are about to drop the column `genre` on the `Publication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Publication" DROP COLUMN "genre",
ADD COLUMN     "genres" VARCHAR(64)[],
ALTER COLUMN "booksOfInterest" SET NOT NULL,
ALTER COLUMN "booksOfInterest" SET DATA TYPE TEXT;
