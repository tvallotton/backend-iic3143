-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "status" "PublicationStatus" NOT NULL DEFAULT 'AVAILABLE';
