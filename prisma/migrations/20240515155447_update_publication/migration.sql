/*
  Warnings:

  - Added the required column `ISBN` to the `Publication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `genre` to the `Publication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Publication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Publication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "ISBN" TEXT NOT NULL,
ADD COLUMN     "booksOfInterest" TEXT[],
ADD COLUMN     "genre" TEXT NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;
