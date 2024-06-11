import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env["JWT_SECRET"] || Math.random() + "";
const prisma = new PrismaClient();

export const getAllReviews = async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany();
  res.json(reviews);
};

export const getReviewById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const review = await prisma.review.findUnique({
    where: {
      id: id
    }
  });
  if (review) {
    res.json(review);
  } else {
    res.json({ error: "Review not found" });
  }
};

export const createReview = async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const { id } = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET, {}) as { id: number; };
  console.log(id)
  const { 
    rating,
    comment,
    reviewedUserId,
    publicationId,
  } = req.body;
  console.log(rating, comment, reviewedUserId, publicationId)
  prisma.review.create({
    data: {
      rating: rating,
      comment: comment,
      userId: id,
      reviewedUserId: reviewedUserId,
      publicationId: parseInt(publicationId)
    }
  }).then((review) => {
    res.json(review);
  }
  ).catch((error) => {
    res.json({ error: error.message });
  });
};

export const getReviewsReceived = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  // user has a list of reviews received thanks to the relation made
  const user = await prisma.user.findUnique({
    where: {
      id: id
    },
    include: {
      ReviewsReceived: true
    }
  });
  res.json(user?.ReviewsReceived);
}

export const getReviewsGiven = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  // user has a list of reviews given thanks to the relation made
  const user = await prisma.user.findUnique({
    where: {
      id: id
    },
    include: {
      ReviewsGiven: true
    }
  });
  res.json(user?.ReviewsGiven);
}

export const getUserRating = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: {
      id: id
    },
    include: {
      ReviewsReceived: true
    }
  });
  const reviews = user?.ReviewsReceived;
  if (reviews) {
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = total / reviews.length;
    res.json({ average });
  } else {
    res.json({ average: 0 });
  }
}