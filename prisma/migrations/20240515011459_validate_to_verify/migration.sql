/*
  Warnings:

  - You are about to drop the column `isValidated` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isValidated",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
