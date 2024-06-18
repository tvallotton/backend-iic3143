import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

export const JWT_SECRET = process.env["JWT_SECRET"] || Math.random() + "";
const prisma = new PrismaClient();

export const getAllReviews = async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany();
  res.json(reviews);
};

export const getReviewById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const review = await prisma.review.findUnique({
    where: {
      id,
    },
  });
  if (review) {
    res.json(review);
  } else {
    res.json({ error: "Review not found" });
  }
};

export const createReview = async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) {
    return res.status(500).json({ error: "Internal server error" });
  }

  const { rating, comment, reviewedUserId, publicationId } = req.body;
  prisma.review
    .create({
      data: {
        rating: rating as number,
        comment: comment as string,
        userId: id,
        reviewedUserId: reviewedUserId as string,
        publicationId: publicationId as string,
      },
    })
    .then((review) => {
      res.json(review);
    })
    .catch((error) => {
      res.json({ error: error.message });
    });
};

export const getReviewsReceived = async (req: Request, res: Response) => {
  const { id } = req.params;
  // user has a list of reviews received thanks to the relation made
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      ReviewsReceived: true,
    },
  });
  res.json(user?.ReviewsReceived);
};

export const getReviewsGiven = async (req: Request, res: Response) => {
  const { id } = req.params;
  // user has a list of reviews given thanks to the relation made
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      ReviewsGiven: true,
    },
  });
  res.json(user?.ReviewsGiven);
};

export const getUserRating = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      ReviewsReceived: true,
    },
  });
  const reviews = user?.ReviewsReceived;
  if (reviews) {
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = total / reviews.length;
    res.json({ average });
  } else {
    res.json({ average: 0 });
  }
};
