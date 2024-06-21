/*
  Warnings:

  - The primary key for the `Publication` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `status` on the `Publication` table. All the data in the column will be lost.
  - You are about to alter the column `title` on the `Publication` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `author` on the `Publication` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `language` on the `Publication` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `bookId` on the `Publication` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `Review` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(320)`.
  - You are about to alter the column `password` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `name` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `lastName` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - Changed the type of `id` on the `Publication` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ownerId` on the `Publication` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Publication` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookState` on the `Publication` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `publicationId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `reviewedUserId` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BookState" AS ENUM ('NEW', 'LIKE_NEW', 'USED', 'VERY_USED');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('SELL', 'TRADE', 'SELL_TRADE');

-- DropForeignKey
ALTER TABLE "Publication" DROP CONSTRAINT "Publication_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_publicationId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_reviewedUserId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "Publication" DROP CONSTRAINT "Publication_pkey",
DROP COLUMN "status",
ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "author" SET DATA TYPE VARCHAR(255),
DROP COLUMN "ownerId",
ADD COLUMN     "ownerId" UUID NOT NULL,
ALTER COLUMN "language" SET DATA TYPE VARCHAR(32),
DROP COLUMN "type",
ADD COLUMN     "type" "PublicationType" NOT NULL,
ALTER COLUMN "bookId" SET DATA TYPE VARCHAR(64),
DROP COLUMN "bookState",
ADD COLUMN     "bookState" "BookState" NOT NULL,
ADD CONSTRAINT "Publication_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Review" DROP CONSTRAINT "Review_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "publicationId",
ADD COLUMN     "publicationId" UUID NOT NULL,
DROP COLUMN "reviewedUserId",
ADD COLUMN     "reviewedUserId" UUID NOT NULL,
ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(320),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "lastName" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedUserId_fkey" FOREIGN KEY ("reviewedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
