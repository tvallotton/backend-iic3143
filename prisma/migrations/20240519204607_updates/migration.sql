/*
  Warnings:

  - You are about to drop the column `state` on the `Publication` table. All the data in the column will be lost.
  - You are about to drop the column `birthday` on the `User` table. All the data in the column will be lost.
  - Added the required column `bookState` to the `Publication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Publication" DROP COLUMN "state",
ADD COLUMN     "bookState" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "birthday",
ADD COLUMN     "birthdate" TIMESTAMP(3);
